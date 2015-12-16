var app = require('./express');
var events = require('events');
var Event = new events.EventEmitter();

var mcmsCartObj = require('../index'),
    mcmsCart = mcmsCartObj.Cart(app),
    Cart = new mcmsCart('cart',{},{
        Event : Event
    });
app.use(Cart.init());
//var Coupon = require("../lib/coupon")(Cart,Event);
var couponsJson = require('./coupons.json');
var lo = require('lodash');
//var conditions = require('../lib/condition');

Event.on('coupon.error',function(error){
    console.log(arguments)
});


app.get('/', function(req, res) {
    var collection = {
        id :'12',
        sku : 'EAS_690',
        name: 'item',
        subtotal: 400,
        price: 100,
        qty: 4,
/*        attributes : {
            size : {
                label: 'Large',
                value: 'l',
                type : '%',
                price: 10
            }
        }*/
    };

    Cart.add(collection);

    var couponCodeToApply = '5452';
    var shippingInfo = [{
        'full_name' : 'John Doe',
        'address'   : 'Example Street'
    }];

    Cart.setMetaData('shippingInfo',shippingInfo);

    Cart.Coupon.fill(couponsJson);
//var Coupons = Cart.Coupon.get();
    var couponToWorkWith = Cart.Coupon.findCoupon({coupon: couponCodeToApply});
//Cart.Coupon.update({id : couponToWorkWith.id},{title : 'bogus'});
//Cart.Coupon.remove({id : couponToWorkWith.id});

    //console.log(couponToWorkWith);
    Cart.Coupon.validate(couponCodeToApply);
/*    var Condition = new conditions({
        name : 'coupon',
        type: 'discount',
        target : 'subtotal'
    });

    Condition.setActions([
        {value : '-'+couponToWorkWith.discount}
    ]);

    Cart.condition(Condition);*/

    res.send({
        cart : Cart.fullCart()
    });
});

var server = app.listen(8083, function() {
    console.log('Express server listening on port ' + server.address().port);
});