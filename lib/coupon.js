module.exports = (function(Cart,Event){
    'use strict';

    var lo = require('lodash'),
        Condition = Cart.Condition,
        Coupons = [],
        moment = require('moment');

    var Coupon = {
        fill : fill,
        add : add,
        update : update,
        remove : remove,
        get : get,
        applyCouponByName : applyCouponByName,
        applyCode : applyCode,
        findCoupon : findCoupon,
        validate : validate,
        applyDiscountToCart : applyDiscountToCart,
        removeDiscountFromCart : removeDiscountFromCart,
        checkUserUsedTimes : checkUserUsedTimes,
        checkCategoryInCart : checkCategoryInCart,
        checkProductInCart : checkProductInCart,
        checkCouponExpiry : checkCouponExpiry,
        invalidateCoupon : invalidateCoupon,
        syncToDataStore : syncToDataStore
    };




    function fill(coupons){
        Coupons = Coupons.concat(coupons);
        return this;
    }

    function add(coupon) {
        Coupons.push(coupon);
        return this;
    }

    function update(id,data) {
        var coupon = this.findCoupon(id);
        coupon = lo.merge(coupon,data);
        return this;
    }

    function remove(id) {
        var coupon = this.findCoupon(id,true);
        Coupons.splice(coupon,1);
        return this;
    }

    function get() {
        return Coupons;
    }

    function applyCouponByName() {

    }

    function applyCode() {

    }

    function findCoupon(search,byIndex) {
        var found = (byIndex) ? lo.findIndex(Coupons,search) : lo.find(Coupons,search);
        if (!found){
            return false;
        }

        return found;
    }

    function validate(code,options) {
        var discountApplied = false;
        //find coupon or return false
        var coupon = this.findCoupon({code : code});

        if (!coupon){
            Event.emit('coupon.error','notFound');
            return false;
        }
        //check if coupon already applied
        var appliedConditions = Cart.appliedConditions;
        //console.log(appliedConditions);

        //check for minimum amount
        if (coupon.minimum > Cart.subTotal()){
            Event.emit('coupon.error','minimum_not_reached');
            return false;
        }
        //check expiry
        if (!this.checkCouponExpiry(coupon.expire)){
            Event.emit('coupon.error','expired');
            return false;
        }

        //check if product is in cart
        if (coupon.products && coupon.products.length > 0){
            var products = this.checkProductInCart(coupon.products);
            if (!products){
                Event.emit('coupon.error','product_not_in_cart');
                return false;
            }

            products.forEach(function(product){
                //apply the condition to the item
                if (!product.conditions){
                    product.conditions = [createCondition(coupon)];
                } else {
                    product.conditions.push(createCondition(coupon));
                }
            });


            Cart.applyCoupon(coupon);
            Event.emit('coupon.success',coupon);
            return true;
        }
        //check times used


        var conditionToApply = createCondition(coupon);

        Cart.condition(conditionToApply)
            .applyCoupon(coupon);
        Event.emit('coupon.success',coupon);
        return true;
    }

    function createCondition(coupon){
        //apply the discount via conditions
        var conditionToApply = new Condition({
            name : coupon.title,
            type: 'discount',
            target : coupon.target || 'subtotal'
        });
        var discountVal = (coupon.discount_type == '%') ? coupon.discount+'%' : coupon.discount;
        conditionToApply.setActions([
            {value : '-'+discountVal}
        ]);

        return conditionToApply;
    }

    function applyDiscountToCart() {

    }

    function removeDiscountFromCart() {
        var cart = Cart.fullCart();
        var coupon = cart.coupon;
        Cart.removeConditionByName(coupon.title,true);
        Cart.removeCouponFromCart();
        return this;
    }

    function checkUserUsedTimes() {

    }

    function checkCategoryInCart() {

    }

    function checkProductInCart(products) {
        var items = Cart.items(),
            cartItems = [],
            found = [];
        for (var a in items){
            cartItems.push(items[a].id);
        }

        var common = lo.intersection(cartItems,products);
        if (common.length == 0){
            return false;
        }

        for (var a in common){
            found.push(Cart.findOne({id : common[a]}));
        }

        return found;
    }

    function checkCouponExpiry(expiry) {
        if (!expiry){
            return true;
        }
        var expiryDate = moment(expiry);
        if (expiryDate.isBefore(moment())){
            return false;
        }

        return true;
    }

    function invalidateCoupon() {

    }

    function syncToDataStore() {

    }

    return Coupon;
});
