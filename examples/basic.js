var app = require('./express');
var mcmsCartObj = require('../index'),
    mcmsCart = mcmsCartObj.Cart(app),
    conditions = mcmsCartObj.Conditions;

var Condition = new conditions({
    name : 'VAT (18%)',
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
    WishList.clear(req);

    //var newItem = Cart.add({id : 1, title : 'test product',price: 10,qty:1,conditions:Condition});
    //Cart.update(newItem.id,{title : 'new product',price : 12.17,qty : 2});
    //Cart.update(newItem.id,4);

    //var newItem = Cart.add({id : 2, title : 'test product 2',price: 5,qty:1});
    //Cart.remove(newItem.id);
/*    Cart.addMultiple([
        {id : 3, title : 'test product 3',price: 10,qty:3,conditions:[Condition,discountCondition]},
        {id : 4, title : 'test product 4',price: 9,qty:1}
    ]);*/

    WishList.add({id : 1, title : 'test product',price: 10,qty:1});
    WishList.condition(Condition)
        .condition(discountCondition);//apply this condition to the entire cart
    //Cart.removeConditionByType('tax',true);
    //WishList.removeConditionByType('tax') ;
    //Cart.clear(req);
    res.send({
        cart : Cart.fullCart(),
        wishList : WishList.fullCart()
    });
});

app.get('/add',function(req,res,send){
    Cart.add({id : 1, title : 'test product',price: 10,qty:1,conditions:Condition});
    WishList.add({id : 1, title : 'test product',price: 10,qty:1});
    res.send({
        cart : Cart.fullCart(),
        wishList : WishList.fullCart()
    });
});

app.get('/clear',function(req,res,send){
    Cart.clear();
    res.send({
        cart : Cart.fullCart(),
        wishList : WishList.fullCart()
    });
});


app.get('/get',function(req,res,send){
    res.send({
        cart : Cart.fullCart(),
        wishList : WishList.fullCart()
    });

});

var server = app.listen(8083, function() {
    console.log('Express server listening on port ' + server.address().port);
});