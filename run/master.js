var osc_address = "/a2r/announce/" ;

var osc = require('osc-min') ;
var worker = require('child_process') ;
var net = require('net') ;

var syslog = require('../lib/syslog') ;
var config = require('../lib/configloader').load('proxy.config') ;
var sfactory = require('../lib/session') ;
var sessions = require('../lib/sessions') ;
var launcher = require('../lib/collector_launcher') ;
var notifier = require('../lib/index_notifier') ;

var master = function() {

  var server = net.createServer(function(c) {
    syslog.log(syslog.LOG_INFO, "backend " + c.remoteAddress + " connected to master a2r_proxy") ;

    c.on('data', function(data) {

      function startCollectors(session) {

        for (var i=0; i<session.data.sensors.length; i++) {
          var port = launcher.startCollector(session, session.data.sensors[i]) ;
          session.data.sensors[i]['port'] = port ;
        }

        notifier.notifyIndex(session) ;
        sessions.register(session) ;
      }

      var inputData = "" ;
      var session = sessions.find(c.remoteAddress, c.remotePort) ;
      if (session === undefined) session = sfactory.createSession(c) ;
      session.data = {} ;
      session.data['sensors'] = [] ;
      session.backend['host'] = c.remoteAddress ;

      // first parse osc to hash
      try {
        inputData = osc.fromBuffer(data) ;
        if (inputData.elements === undefined) {
          syslog.log(syslog.LOG_ERR, "this is not a bundle") ;
          throw new Error("not a bundle") ;
        }
      } catch (err) {
        syslog.log(syslog.LOG_ERR, "recieved malformated osc input from backend " + c.remoteAddress) ;
        return ;
      }

      // cycle thrue all osc messages
      for (i=0; i<inputData.elements.length; i++) {
        var element = inputData.elements[i] ;

        // **** This is a massage and therefore should be metadata ****
        if (element.oscType == 'message') {

          // This is no osc for us
          if (element.address.search(osc_address) == -1) continue ;

          if (element.args.length > 0) {
            var key = element.address.substring(element.address.lastIndexOf("/")+1, element.address.length).toLowerCase() ;
            var val = element.args[0].value ;
            if (key == "port") {
              session.backend[key] = val ;
            } else {
              session.data[key] = val ;
            }

            syslog.log(syslog.LOG_DEBUG, "Metadata:\t" + key + " : " + val) ;
          }
        } 
        
        // **** This is a bundle and therefor should be a sensor ****
        else {
          var sensor = {} ;
          for (j=0; j<inputData.elements[i].elements.length; j++) {
          element = inputData.elements[i].elements[j] ;

            // This is no osc for us
            if (element.address.search(osc_address) == -1) continue ;

            if (element.args.length > 0) {
              var key = element.address.substring(element.address.lastIndexOf("/")+1, element.address.length).toLowerCase() ;
              var val = element.args[0].value ;
              sensor[key] = val ;

              syslog.log(syslog.LOG_DEBUG, "Sensordata:\t" + key + " : " + val) ;
            }
          }

          if (sensor['name'] !== undefined) {
            session.data['sensors'].push(sensor) ;
          }
        }
      }
    
      if (session.data['name'] === undefined) {
        syslog.log(syslog.LOG_ERR, "Announce from " + session.backend['host'] + " missed name") ;
        return ;
      }

      if (session.backend['port'] === undefined) {
        syslog.log(syslog.LOG_ERR, "Announce from " + session.backend['host'] + " missed port") ;
        return ;
      }
    
      if (session.data['title'] === undefined) session.data['title'] = session.data['name'] ;

      // go further with starting necessary collector processes
      startCollectors(session) ;

    }.bind(this)) ;
   
    c.on('close', function(data) {
      syslog.log(syslog.LOG_INFO, "backend " + c.remoteAddress + " closed connection") ;
    }) ;
  }) ;

  return server ;
}

module.exports = master() ;
