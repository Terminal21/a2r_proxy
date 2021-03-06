var syslog = require('./syslog') ;
var worker = require('child_process') ;

var launcher = (function() {
  var port = 17001 ;

  function startCollector(session) {
    var collector = worker.fork('run/collector', ['--proxyport', port, '--backendport', session.backend.port, '--backendhost', session.backend.host, '--oscaddress', '/a2r/' + session.data.name]) ;

    session.collector = collector ;
    syslog.log(syslog.LOG_INFO, 'spawned new sensor collector at port ' + port) ;

    return port++ ;
  }

  function stopCollector(session) {
    session.collector.kill() ;
    syslog.log(syslog.LOG_INFO, 'stopped sensor collector at port ' + session.data.port) ;
  }

 return {
    startCollector: startCollector,
    stopCollector: stopCollector
 } ;
})() ;

module.exports = launcher ;

