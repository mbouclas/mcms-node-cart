/**
 * Needs to have a configurable store
 * Needs to be initialized per instance so that we can have cart - wishlist etc
 * Needs toJSON and toArray methods
 * Needs to support meta-data or custom attributes
 * Search cart using lodash
 * Add single - multiple items
 * A Sync method to save it to the store
 * Conditions...
 * Events
 *
 * */

var md5 = require('md5');
var lo = require('lodash');
var events = require('events');
var conditions = require('./condition');
var Money = require('money');

exports.Conditions = conditions;
exports.Cart  = (function(App){

    /**
     *
     * @param name
     * @param store expects storage object to save the cart to DB
     * @param config expects object
     */
    function mcmsCart(name,Store,config){
        this.Name = name || 'cart';
        this._key = md5(this.Name);
        this.conditionsTotal  = 0;
        this.sessionTemplate = {
            items : [],
            subTotal : 0,
            total : 0,
            conditions : {},
            id : this._key
        };

        this.vatRate = 0;
        //You can use your own Event emitter
        this.Event = (typeof config == 'undefined' || typeof config.Event == 'undefined') ? new events.EventEmitter() : config.Event;
    }

    mcmsCart.prototype.init = function(){
        return require('./Middleware/initialize')(this);
    };

    /**
     *
     * @param item
     * @returns {{items: Array, subTotal: number, total: number, conditions: {}}|*}
     */
    mcmsCart.prototype.add = function(item){
        this.Event.emit('cart.adding',item,this.Session);
        //Generate unique RowID
        var rowId = generateItemID(item.id,lo.omit(item,['price','qty','rowId']));

        //update cart?
        //return item

        var findProduct = this.findOne({rowId : rowId});
        if (findProduct){
            findProduct.qty++;
        } else {
            item.rowId = rowId;
            this.Session.items.push(item);
        }

        this.Event.emit('cart.added',item,this.Session);
        return item;
    };

    /**
     *
     * @param items
     */
    mcmsCart.prototype.addMultiple = function(items){
        var _this = this;
        lo.each(items,function(element, index, list){
            _this.add(element);
        });
    };

    /**
     *
     * @param condition
     * @returns {mcmsCart}
     */
    mcmsCart.prototype.condition = function(condition){
        this.Session.conditions[condition.collection.name] = condition;
        return this;
    };

    mcmsCart.prototype.applyConditions = function(condition){

    };

    /**
     *
     * @param id
     * @param data
     * @returns {mcmsCart}
     */
    mcmsCart.prototype.update = function(id,data){
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
     * @returns {mcmsCart}
     */
    mcmsCart.prototype.remove = function(item){
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
     * @returns {mcmsCart}
     */
    mcmsCart.prototype.find = function(condition){

       return lo.where(this.Session.items,condition);
    };

    /**
     *
     * @param condition
     * @returns {mcmsCart}
     */
    mcmsCart.prototype.findOne = function(condition){
        return lo.findWhere(this.Session.items,condition);
    };

    mcmsCart.prototype.items = function(){
        return this.Session.items;
    };

    mcmsCart.prototype.clear = function(){
        this.Event.emit('cart.clearing',this.Session);
        this.Session = this.sessionTemplate;
        this.Event.emit('cart.cleared',this.Session);
        return this;
    };

    mcmsCart.prototype.itemsTotal = function(){
        var total = lo.reduce(this.Session.items,function(memo,item){
            var price = parseFloat(item.price),
                conditionsTotal = 0;
            //check for conditions
            if (item.conditions){
                if (lo.isArray(item.conditions)){
                    for (var a in item.conditions){
                        price = item.conditions[a].apply({subtotal : price});
                        conditionsTotal += item.conditions[a].finalResult();
                    }
                } else {
                    price = item.conditions.apply({subtotal : price});
                    conditionsTotal = item.conditions.finalResult();
                }
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
    mcmsCart.prototype.subTotal = function(){
        var subTotal = 0,
            conditionsTotal = 0;

        var itemsTotal = this.itemsTotal();

        subTotal = itemsTotal;

        if (!lo.isEmpty(this.Session.conditions)){
            for (var a in this.Session.conditions){
                subTotal = this.Session.conditions[a].apply({subtotal : subTotal});
                this.conditionsTotal += this.Session.conditions[a].finalResult();
            }
        }


        return subTotal;
    };

    /**
     * this.itemTotal(this.baseCurrency()) * this.vat().rate()
     */
    mcmsCart.prototype.vatTotal = function(){

    };


    /**
     *
     * @returns {*}
     */
    mcmsCart.prototype.totalWeight = function(){
        return lo.reduce(this.Session.items,function(memo,item){
            return memo + item.weight;
        },0);
    };

    /**
     *
     * @returns {*}
     */
    mcmsCart.prototype.totalQuantity = function(){
        return lo.reduce(this.Session.items,function(memo,item){
            return memo + item.qty;
        },0);
    };

    /**
     *
     * @returns {*}
     */
    mcmsCart.prototype.totalItems = function(){
        return this.Session.items.length;
    };


    mcmsCart.prototype.toJSON = function(){
        return JSON.stringify(this.Session);
    };

    mcmsCart.prototype.getIdentity = function(){
        return this._key;
    };

    mcmsCart.prototype.fullCart = function(){
        return lo.merge(this.Session,{
            itemsTotal : this.itemsTotal(),
            subTotal : this.subTotal(),
            totalQty : this.totalQuantity(),
            totalItems : this.totalItems(),
            cartID : this.getIdentity(),
            conditionsTotal : this.conditionsTotal
        });
    };


    mcmsCart.prototype.updateTotals = function(){
        this.Session.subTotal = this.subTotal();
        this.Session.vatTotal = this.vatTotal();
        this.Session.itemsTotal = this.itemsTotal();
        return this;
    };

    function generateItemID(id,item){
        return md5(id + JSON.stringify(item));
    }

    return  mcmsCart;
});