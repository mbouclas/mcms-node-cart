/**
 * Needs to have a configurable store
 * Needs to be initialized per instance so that we can have cart - wishlist etc
 * Needs toJSON and toArray methods
 * Needs to support meta-data or custom attributes
 * Search cart using lodash
 * Add single - multiple items
 * A Sync method to save it to the store
 *
 * */

var md5 = require('MD5');
var lo = require('lodash');
var events = require('events');
var conditions = require('./condition');
var coupons = require('./coupon');

exports.Conditions = conditions;
exports.Coupons = coupons;
exports.Cart  = (function(App){

    /**
     *
     * @param name
     * @param store expects storage object to save the cart to DB
     * @param config expects object
     */
    function McmsCart(name,Store,config){
        this.Name = name || 'cart';
        this._key = md5(this.Name);
        this.Condition = conditions;
        this.conditionsTotal  = 0;
        this.appliedConditions = [];
        this.metaData = {};

        this.vatRate = 0;
        //You can use your own Event emitter
        this.Event = (typeof config == 'undefined' || typeof config.Event == 'undefined') ? new events.EventEmitter() : config.Event;
        this.Coupon = coupons(this,this.Event);
        this.couponApplied = {};
    }

    McmsCart.prototype.newSession = function(){
        var template = {
            items : [],
            subTotal : 0,
            conditions : {},
            id : this._key
        };

        return lo.clone(template);
    };

    McmsCart.prototype.init = function(){
        return require('./Middleware/initialize')(this);
    };

    /**
     *
     * @param item
     * @returns {{items: Array, subTotal: number, total: number, conditions: {}}|*}
     */
    McmsCart.prototype.add = function(item){
        if (!item.attributes || !lo.isObject(item.attributes)){
            item.attributes = [];
        }

        this.Event.emit('cart.adding',item,this.Session);
        //Generate unique RowID
        var rowId = generateItemID(item.id,lo.omit(item,['price','qty','rowId','conditions']));

        //update cart?
        //return item

        var findProduct = this.findOne({rowId : rowId});
        if (findProduct){
            findProduct.qty++;
        } else {
            item.rowId = rowId;
            item.attributesPrice = prepareItemAttributes(item.attributes,item.price);

            this.Session.items.push(item);
        }

        this.Event.emit('cart.added',item,this.Session);
        return item;
    };

    function prepareItemAttributes(attrs,price){
        var extraPrice = 0;
        if (attrs.length == 0){
            return 0;
        }

        lo.forEach(attrs,function(option,index){
            if (!option.value){
                return;
            }

            if (option.price){
                extraPrice = (option.type == '%') ? price + ((option.price/100)*price) : price + option.price;
            }
        });

        return extraPrice-price;
    }

    /**
     *
     * @param items
     */
    McmsCart.prototype.addMultiple = function(items){
        var _this = this;
        lo.each(items,function(element, index, list){
            _this.add(element);
        });
    };

    McmsCart.prototype.setMetaData = function(key,data){
        this.metaData[key] = data;
        this.Event.emit('cart.addedMetaData',key,data);
    };

    McmsCart.prototype.getMetaData = function(key){
        if (!key){
            return this.metaData;
        }

        return this.metaData[key];
    };

    McmsCart.prototype.removeMetaData = function(key){
        if (!key){
            this.metaData = {};
            return this;
        }

        delete this.metaData[key];
        return this;
    };

    /**
     *
     * @param condition
     * @returns {McmsCart}
     */
    McmsCart.prototype.condition = function(condition){
        if (this.Session.items.length == 0){
            console.log('No items found');
            return this;
        }

        this.Session.conditions[condition.collection.name] = condition;
        //console.log('condition',this.Session.conditions)
        this.appliedConditions.push(condition);
        return this;
    };

    McmsCart.prototype.applyConditions = function(condition){

    };

    /**
     *
     * @param id
     * @param data
     * @returns {McmsCart}
     */
    McmsCart.prototype.update = function(id,data){
        var findProduct = this.findOne({id : id});
        if (findProduct){
            this.Event.emit('cart.updating',id,data,this.Session);
            if (typeof data == 'object'){//update the entire product
                findProduct = lo.merge(findProduct,data);
            } else {//just update quantity
                findProduct.qty = data;
            }
            this.updateTotals();
            this.Event.emit('cart.updated',id,data,this.Session);
        }

        return this;
    };


    /**
     *
     * @param item
     * @returns {McmsCart}
     */
    McmsCart.prototype.remove = function(item){
        var searchCondition = (typeof item == 'object') ? item : {id : item};


        if (lo.isArray(item)){

        }
        var found = this.findOne(searchCondition);
        if (!found){
            return this;
        }
        this.Event.emit('cart.deleting',item,this.Session);
        this.Session.items.splice(this.Session.items.indexOf(found),1);
        this.Event.emit('cart.deleted',item,this.Session);
        return this;
    };

    /**
     *
     * @param condition
     * @returns {McmsCart}
     */
    McmsCart.prototype.find = function(condition){

        return lo.where(this.Session.items,condition);
    };

    /**
     *
     * @param condition
     * @returns {McmsCart}
     */
    McmsCart.prototype.findOne = function(condition){
        return lo.findWhere(this.Session.items,condition);
    };

    McmsCart.prototype.items = function(){
        return this.Session.items;
    };

    McmsCart.prototype.removeConditionByName = function(name,includeItems){
        delete this.Session.conditions[name];

        //we have to look into all cart items for this condition and remove it
        if (includeItems){
            //some serious bugs in here. When removing from an array of conditions it keeps the price
            //applied by the previous condition. We need to re-apply the conditions to the product
            //so that they will return the correct result.
            this.Session.items = removeConditionFromItems(this.Session.items,name,'name');
        }

        this.updateTotals();

        return this;
    };

    McmsCart.prototype.removeConditionByType = function(type,includeItems){
        var _this = this;
        lo.each(this.Session.conditions,function(condition,index){
            if (typeof condition == 'undefined'){
                return;
            }

            if (condition.collection.type == type){
                delete _this.Session.conditions[index];
            }
        });



        if (includeItems){
            //some serious bugs in here. When removing from an array of conditions it keeps the price
            //applied by the previous condition. We need to re-apply the conditions to the product
            //so that they will return the correct result.
            this.Session.items = removeConditionFromItems(this.Session.items,type,'type');
        }

        this.updateTotals();

        return this;
    };


    McmsCart.prototype.removeConditions = function(includeItems){
        this.Session.conditions = {};
        if (includeItems){
            lo.each(this.Session.items,function(item){
                item.conditions = {};
            });
        }

        this.updateTotals();

        return this;
    };

    McmsCart.prototype.clear = function(){
        this.Event.emit('cart.clearing',this.Session);
        this.clearSession();
        this.Session = this.newSession();
        this.Event.emit('cart.cleared',this.Session);
        return this;
    };

    McmsCart.prototype.itemsTotal = function(){
        var _this = this;
        var total = lo.reduce(this.Session.items,function(memo,item){
            if (typeof item == 'undefined'){
                return;
            }

            var price = parseFloat(item.price),
                conditionsTotal = 0;
            //check for conditions

            if (item.conditions){
                if (lo.isArray(item.conditions)){
                    var len = item.conditions.length;
                    for (var i=0;len > i;i++){
                        if (!item.conditions[i].collection){
                            continue;
                        }
                        var Cond = new _this.Condition(item.conditions[i]);
                        price = Cond.apply({subtotal : price});
                        conditionsTotal += Cond.finalResult();
                    }
                } else {
                    if (item.conditions.collection){
                        var Cond = new _this.Condition(item.conditions);
                        price = Cond.apply({subtotal : price});
                        conditionsTotal += Cond.finalResult();
                    }
                }
            }

            if (item.attributesPrice){
                price = price + item.attributesPrice;
            }

            item.finalPrice = price;
            item.conditionsTotal = conditionsTotal;
            return memo + (price * item.qty);
        },0);
        return total;
    };

    /**
     * (this.itemTotal() + this.payment().fee() + this.shipment().fee() ) * currency.rate()
     * @returns {*}
     */
    McmsCart.prototype.subTotal = function(){
        var subTotal = 0,
            conditionsTotal = 0;
        this.conditionsTotal = 0;

        subTotal = this.itemsTotal();

        if (!lo.isEmpty(this.Session.conditions)){
            for (var a in this.Session.conditions){
                var Cond = new this.Condition(this.Session.conditions[a]);
                subTotal = Cond.apply({subtotal : subTotal});
                this.conditionsTotal += Cond.finalResult();
            }
        }


        return subTotal;
    };

    /**
     * this.itemTotal(this.baseCurrency()) * this.vat().rate()
     */
    McmsCart.prototype.vatTotal = function(){

    };


    /**
     *
     * @returns {*}
     */
    McmsCart.prototype.totalWeight = function(){
        return lo.reduce(this.Session.items,function(memo,item){
            return memo + item.weight;
        },0);
    };

    /**
     *
     * @returns {*}
     */
    McmsCart.prototype.totalQuantity = function(){
        return lo.reduce(this.Session.items,function(memo,item){
            return memo + item.qty;
        },0);
    };

    /**
     *
     * @returns {*}
     */
    McmsCart.prototype.totalItems = function(){
        return this.Session.items.length;
    };


    McmsCart.prototype.toJSON = function(){
        return JSON.stringify(this.Session);
    };

    McmsCart.prototype.getIdentity = function(){
        return this._key;
    };

    McmsCart.prototype.fullCart = function(){
        return lo.merge(this.Session,{
            itemsTotal : this.itemsTotal(),
            subTotal : this.subTotal(),
            totalQty : this.totalQuantity(),
            totalItems : this.totalItems(),
            cartID : this.getIdentity(),
            conditionsTotal : this.conditionsTotal,
            metaData : this.metaData,
            coupon : this.getCouponInfo()
        });
    };


    McmsCart.prototype.updateTotals = function(){
        this.Session.subTotal = this.subTotal();
        this.Session.total = this.total;
        this.Session.vatTotal = this.vatTotal();
        this.Session.itemsTotal = this.itemsTotal();
        return this;
    };

    McmsCart.prototype.getCouponInfo = function(){

        if (!this.couponApplied.code){
            return {};
        }

        return {
            title : this.couponApplied.title,
            code : this.couponApplied.code,
            discount : this.couponApplied.discount,
            discount_type : this.couponApplied.discount_type,
            permalink : this.couponApplied.permalink
        }
    };

    McmsCart.prototype.removeCouponFromCart = function(){
        this.couponApplied = {};
        this.Session.coupon = {};
    };

    McmsCart.prototype.applyCoupon = function(coupon){
        this.couponApplied = coupon;
        this.Session.coupon = coupon;
    };

    function generateItemID(id,item){
        return md5(id + JSON.stringify(item));
    }

    function removeConditionFromItems(items, name, type) {

        for (var a in items){
            var item = items[a];
            if (lo.isArray(item.conditions)){
                lo.each(item.conditions,function(element){
                    if (typeof element == 'undefined'){
                        return;
                    }

                    if (typeof element.collection != 'undefined' && element.collection[type] == name){
                        item.conditions.splice(item.conditions.indexOf(element),1);
                    }
                });
            } else {
                if (typeof item.conditions != 'undefined' && typeof item.conditions.collection != 'undefined'
                    && item.conditions.collection[type] == name){
                    item.conditions = {};
                }
            }
        }

        return items;
    }

    return  McmsCart;
});