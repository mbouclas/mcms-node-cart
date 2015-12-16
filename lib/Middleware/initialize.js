var lo = require('lodash');
module.exports = function initialize(mcmsCart) {

    return function initialize(req, res, next) {
        if (!req._mcmsCart){
            req._mcmsCart = {};
            req._mcmsCart.instance = mcmsCart;
        }

        if (req.session && req.session[mcmsCart._key]) {
            // load data from existing session
            req._mcmsCart.session = req.session[mcmsCart._key];
        } else if (req.session && !req.session[mcmsCart._key]) {
            // initialize new session
            console.log('new session' + mcmsCart._key);
            req.session[mcmsCart._key] = mcmsCart.newSession();
            req._mcmsCart.session = req.session[mcmsCart._key];
            mcmsCart.req = req;
        } else {
            // no session is available
            req._mcmsCart.session = mcmsCart.newSession();
        }

        mcmsCart.Session = req._mcmsCart.session;


        mcmsCart.clearSession = function(){
            delete this.req.session[this._key];
            this.req.session[this._key] = this.newSession();
            console.log(this.req.session[this._key]);

        };

        mcmsCart.Event.emit('cart.created',this.Session);
        next();
    };
};