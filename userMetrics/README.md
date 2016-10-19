User Metrics Folder
----------------
<br/>

The purpose of this folder is to have a place to put custom user definitions for metrics, motes, events, custom functions and variables etc., without the need to directly edit the main metrics.js which might get overwritten during an upgrade.

###How to use:
- place your custom metrics/motes/events in this folder
- whatever objects you define here will be merged with the contents of metrics.js
- if a matching metric/mote/event is redefined in a file this folder, it will override the default from metrics.js, that also means that if duplicates are found, the last one in the last file (alphabetically) will be the winner
- follow the same definition/syntax pattern as in main metrics.js definition file
- each metric could be broken into its own separate file or everything could be in a single file just like in metrics.js, it all gets merged into the main `metricsDef` object
- a basic example is provided as a starting point in _example.js