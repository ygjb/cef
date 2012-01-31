
# cef - a CEF and Syslog Logging Library

CEF is a proprietary format by Arcsight that details how to format messages for easy integration into Arcsights NSM products.  [Arcsight](http://www.arcsight.com/solutions/solutions-cef/) controls the standard, and it can be requested here.

This is a basic library for implementing CEF logging using a simple API.  

## Usage ##



  var console = require("console");
  var http = require("http");
  var util = require("util");
  var cef = require("cef");
   
  
  function onRequest(request, response) {   
      
      // The device configuration is required; these are used to uniquely identify the records in ArcSight.  
      // Work with your security admin; this cannot be null.
      var deviceConfig = {
        	vendor : "Vendor Name",
      		product : "Product Name",
      		version : "Version 0.1"
      }
      
      // The environment contains some details about how the request was generated.  It can be null, but that leaves out meaninful info.
      // You can also pass in additional parameters by adding key value pairs to environ, but you should really add custom fields to the
      // extensions parameter since those will clobber any environ member that has a matching name.
      environ = cef.environFromHTTP(request);
      
      // The extensions are used to fill in additional details.  See the standard for a list of potential fields, and rules.  Can be null.
      extensions = { "suser" : "yvanboily"};
      
      // you can call generateCEF to create content suitable to log to a file directly if your admins want to pull a log file
      r = cef.generateCEF("OMG_HORRIBLE", "Something went Horribly Wrong!", 5, environ, deviceConfig, extensions);
      response.writeHead(200, {"Content-Type": "text/html"});
      response.write(util.format("<html><body><h1>Event Logged</h1><p>%s</p></body></html>", r));
      response.end();
      
      // you also call syslog to send the message to syslog.  You can pass a syslog configuration object which conforms to the
      // options at https://github.com/phuesler/ain/README.md in the subsection Changing Destinations.  See that for more info.
      syslog = null;
      cef.syslog("OMG_HORRIBLE", "Identity Failed", 5, cef.environFromHTTP(request), deviceConfig, extensions, syslog);
  }
  
  
  http.createServer(onRequest).listen(8888);
  console.log("Server has started. CTRL+C to end.");
