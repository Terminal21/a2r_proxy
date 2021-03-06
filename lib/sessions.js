var crypto =  require('crypto') ;

var sessions = (function() {
  
  var sessions = {} ;

  function register(session) {

    var hash = md5(session.connection.remoteAddress, session.connection.remotePort) ;
    sessions[hash] = session ;
  }

  function unregister(address, port) {
    var hash = md5(address, port) ;
    if (sessions[hash] !== undefined) delete sessions[hash] ;
  }

  function find(address, port) {
    var hash = md5(address, port) ;
    return sessions[hash] ;
  }

  var md5 = function (address, port) {

    var md5sum = crypto.createHash('md5') ;
    md5sum.update(address + port) ;

    return md5sum.digest('hex') ;
  }

  return {
    register: register,
    unregister: unregister,
    find: find,
 } ;
})() ;

module.exports = sessions ;

