var lo = require('lodash');
module.exports = function initialize(mcmsCart) {

    return function initialize(req, res, next) {

        if (req.session && req.session[mcmsCart._key]) {
            // load data from existing session
            mcmsCart.Session = req.session[mcmsCart._key];
        } else {
            // initialize new session
            mcmsCart.Session = mcmsCart.newSession();
            req.session[mcmsCart._key] = mcmsCart.Session;
            mcmsCart.req = req;
        }

        mcmsCart.Event.emit('cart.created',mcmsCart.Session);
        next();
    };
};

