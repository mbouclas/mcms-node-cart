var express = require('express');
var expressSession = require('express-session');
var cookieParser = require('cookie-parser');
var app = express();
var secret = 'myAppSecret';
var expires = new Date(Date.now() + 36000);
var Session = {
    secret: secret,
    saveUninitialized : false,
    resave : false,
    maxAge : expires,
    cookie: { maxAge: expires }
};
var sessionStore = expressSession(Session);
app.use(sessionStore);
app.use(cookieParser(secret));
var mcmsCartObj = require('../index'),
    mcmsCart = mcmsCartObj.Cart(app),
    conditions = mcmsCartObj.Conditions;

var Condition = new conditions({
    name : 'VAT',
    type: 'tax',
    target : 'subtotal'
});
//this condition can now be applied either to the cart or to a single item
Condition.setActions({value : '18%'});
var discountCondition = new conditions({
    name : 'discount',
    type: 'discount',
    target : 'subtotal'
});
discountCondition.setActions({value : '-10%'});


var Cart = new mcmsCart('cart');

var WishList = new mcmsCart('wishlist');
app.use(Cart.init());
app.use(WishList.init());

app.get('/', function(req, res){
    WishList.clear();
    WishList.condition(Condition);//apply this condition to the entire cart
    var newItem = Cart.add({id : 1, title : 'test product',price: 10,qty:1,conditions:Condition});
    Cart.update(newItem.id,{title : 'new product',price : 12.17,qty : 2});
    //Cart.update(newItem.id,4);

    //var newItem = Cart.add({id : 2, title : 'test product 2',price: 5,qty:1});
    //Cart.remove(newItem.id);
    Cart.addMultiple([
        {id : 3, title : 'test product 3',price: 10,qty:3,conditions:[Condition,discountCondition]},
        {id : 4, title : 'test product 4',price: 9,qty:1}
    ]);

    WishList.add({id : 1, title : 'test product',price: 10,qty:1});

    res.send({
        cart : Cart.fullCart(),
        wishList : WishList.fullCart()
    });
});

var server = app.listen(8003, function() {
    console.log('Express server listening on port ' + server.address().port);
});