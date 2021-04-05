function authenticate(req, res, next) {
    if(req.session) {
        if(req.session.userId) {
            next()
        } else {
            console.log('falied after passing req.session')
            res.redirect('/login')
        }
    } else {
        res.redirect('/login')
    }
}

module.exports = authenticate 