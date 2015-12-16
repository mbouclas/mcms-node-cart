module.exports = function(mcmsCart) {
    //delete mcmsCart.req.session[mcmsCart._key];
    console.log(mcmsCart.req.session[mcmsCart._key].id)
    mcmsCart.Session = mcmsCart.newSession();
    mcmsCart.req.session[mcmsCart._key] = mcmsCart.newSession();

};