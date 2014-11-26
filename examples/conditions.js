var conditions = require('../lib/condition');
var collection = {
    name : 'item',
    subtotal : 400,
    price : 100,
    qty : 4
};

var Condition = new conditions({
    target : 'price'
});

Condition.setRules([
    'subtotal > 200'
]);

Condition.setActions({value : '-10%',multiplier : 'qty'});
//console.log(Condition.getRules());
//console.log(Condition.getActions());
console.log(Condition.apply(collection),Condition.finalResult());
console.log('--------');
var Cond = new conditions({
    target : 'subtotal'
});
Cond.setActions([
        {value : '12.5%'},
        {value : '5%'}
    ]);
console.log(Cond.apply(collection),Cond.finalResult());
console.log('--------');

var inclusiveCondition = new conditions({
    target : 'price'
});
inclusiveCondition.setActions({value : '10%',inclusive : true});
console.log(inclusiveCondition.apply(collection),inclusiveCondition.finalResult());