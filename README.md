# cef - a CEF and Syslog Logging Library

CEF is a proprietary format by Arcsight that details how to format messages for easy integration into Arcsights NSM products.  [Arcsight](http://www.arcsight.com/solutions/solutions-cef/) controls the standard, and it can be requested here.

This is a basic library for implementing CEF logging using a simple API.  

## Usage ##

Call:

cef.generateCEF(...) to generate a string that is formatted as a CEF log entry

or 

cef.syslog(...) to generate that string and write it to syslog

See [example.js](https://github.com/ygjb/cef/blob/master/example.js) for a detailed example on how to use the API.

## Dependencies ##

Currently none; a copy of the syslog library from https://github.com/phuesler/ain is included with some inline patches to remove some extra bits that interfere with CEF.

