module.exports = function initialize(mcmsCart) {

    return function initialize(req, res, next) {

        req._mcmsCart = {};
        req._mcmsCart.instance = mcmsCart;

        if (req.session && req.session[mcmsCart._key]) {
            // load data from existing session
            req._mcmsCart.session = req.session[mcmsCart._key];
        } else if (req.session) {
            // initialize new session
            req.session[mcmsCart._key] = mcmsCart.sessionTemplate;
            req._mcmsCart.session = req.session[mcmsCart._key];
        } else {
            // no session is available
            req._mcmsCart.session = mcmsCart.sessionTemplate;
        }


        mcmsCart.Session = req._mcmsCart.session;
        mcmsCart.Event.emit('cart.created',this.Session);
        next();
    };
};