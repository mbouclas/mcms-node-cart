var lo = require('lodash');

function Condition(collection){
    this.rules = collection.rules || [];
    this.actions = collection.actions || [];
    this.result = collection.result || 0;
    this.subtotal = collection.subtotal || 0;
    if (collection || typeof collection.collection != 'undefined'){
        this.collection = (collection.collection) ? collection.collection : collection;
    }
    return this;
}

Condition.prototype.getRules = function(){
    return this.rules;
};

Condition.prototype.setRules = function(rules){
    if (lo.isArray(rules)){
        for (var a in rules){
            this.rules.push(rules[a]);
        }
        return this;
    }

    this.rules.push(rules);
    return this;
};

Condition.prototype.getActions = function(){
    return this.actions;
};

Condition.prototype.setActions = function(actions){
    if (lo.isArray(actions)){
        for (var a in actions){
            this.setActions(actions[a]);
        }
        return this;
    }

    this.actions.push(actions);
    return this;
};

Condition.prototype.apply = function(collection,target){
    this.result = 0;
    this.subtotal = 0;
    var _this = this;
    if (this.collection){
        collection = lo.merge(this.collection,collection);
    }

    if (!this.validate(collection)){
        console.log('Validation failed')
        return false;
    }

    var subTotalTarget = collection[target] || collection[collection.target];
    this.subtotal = collection[subTotalTarget] || collection[collection.target];
    lo.reduce(this.actions,function(memo,action){
        _this.subtotal = (_this.result > 0) ? _this.result : _this.subtotal;
        _this.result = applyAction(collection,action,_this.subtotal);
    },0);

    return this.result;
};

Condition.prototype.finalResult = function(collection){
    if (collection){
        this.apply(collection);
    }

    return this.result - this.subtotal;
};

Condition.prototype.validate = function(collection){
    rules = this.rules;

    for (var a in rules) {
        var rule = rules[a];
        if (!validateRule(collection, rule)) {
            return false;
        }
    }

    return true;
};


function applyAction(collection,action,target){
    var max = action.max || 0;
    var operation = action.value;
    var multiplier = (action.multiplier) ? collection[action.multiplier] : 1;

    var actionResult = parseAction(operation);
    var inclusive = (typeof action.inclusive == 'undefined') ? null : action.inclusive;

    if (inclusive){
        var ratio = 1 + (actionResult.value / 100);
        actionResult.value = (actionResult.percentage > 0) ? target - (target / ratio) : value;
    }

    actionResult.value = (actionResult.percentage > 0 && !inclusive)
        ? (target * (actionResult.value) / 100) : actionResult.value;

    return calculate(target, actionResult.operator, actionResult.value, max) * multiplier;
}

function parseAction(value) {
    var percentage = value.indexOf('%');
    var operatorRegex = /[+\-\*\/]/;
    var valuesRegex = /[0-9\.]+/;
    var operator = value.match(operatorRegex);
    var values = value.match(valuesRegex);


    return {
        operator : lo.first(operator),
        percentage : percentage,
        value :lo.first(values)
    };
}

function operatorCheck(target, operator, value){
    switch (operator)
    {
        default:
        case '=':  return target == value;

        case '<=': return target <= value;

        case '>=': return target >= value;

        case '<':  return target < value;

        case '>':  return target > value;

        case '!=': return target != value;
    }
}

function calculate(target, operator, value, max) {
    max = max || 0;

    switch (operator)
    {
        default:
        case '+':

            if (max)
            {
                return (target + max) > (target + value) ? (target + value) : (target + max);
            }

            return target + value;

        case '*':

            if (max)
            {
                return (target + max) > (target * value) ? (target * value) : (target + max);
            }

            return target * value;

        case '-':

            if (max)
            {
                return (target + max) < (target - value) ? (target - value) : (target + max);
            }

            return target - value;
    }
}

function validateRule(collection, rule){
    var operatorRegex = /[=\<\>\!]+/;
    var operators = rule.match(operatorRegex);

    var operator = (lo.first(operators)) ?  lo.first(operators) : null;
    var values = rule.split(operatorRegex);
    for (var a in values){
        values[a] = values[a].trim();
    }

    var result = operatorCheck(collection[values[0]], operator, values[1]);
    return (result) ? result : false;
}
module.exports = Condition;