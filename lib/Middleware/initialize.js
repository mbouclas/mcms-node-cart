var lo = require('lodash');
module.exports = function initialize(mcmsCart) {

    return function initialize(req, res, next) {
        req._mcmsCart = {};
        req._mcmsCart.instance = mcmsCart;

        if (req.session && req.session[mcmsCart._key]) {
            // load data from existing session
            req._mcmsCart.session = req.session[mcmsCart._key];
        } else if (req.session) {
            // initialize new session
            req.session[mcmsCart._key] = lo.clone(mcmsCart.sessionTemplate);
            req._mcmsCart.session = req.session[mcmsCart._key];
        } else {
            // no session is available
            req._mcmsCart.session = lo.clone(mcmsCart.sessionTemplate);
        }

        mcmsCart.Session = req._mcmsCart.session;
        mcmsCart.clearSession = function(){
            delete req.session[mcmsCart._key];
            req.session[mcmsCart._key] = lo.clone(mcmsCart.sessionTemplate);
        };

        mcmsCart.Event.emit('cart.created',this.Session);
        next();
    };
};