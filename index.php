<!DOCTYPE html>
<!--
// ********************************************************************************************
// Websocket front end and web UI for the Moteino IoT Framework
// This page loads from the gateway and will serve the IoT node data and updates as
// they are provided by the gateway, and provide a way to interact with the nodes
// according to the available controls and events defined via the metrics definitions
// contained in the server side files (metrics.js)
// ********************************************************************************************
// Copyright Felix Rusu, Low Power Lab LLC (2015), http://lowpowerlab.com/contact
// http://lowpowerlab.com/gateway
// ********************************************************************************************
//                                    LICENSE
// ********************************************************************************************
// This source code is released under GPL 3.0 with the following ammendments:
// You are free to use, copy, distribute and transmit this Software for non-commercial purposes.
// - You cannot sell this Software for profit while it was released freely to you by Low Power Lab LLC.
// - You may freely use this Software commercially only if you also release it freely,
//   without selling this Software portion of your system for profit to the end user or entity.
//   If this Software runs on a hardware system that you sell for profit, you must not charge
//   any fees for this Software, either upfront or for retainer/support purposes
// - If you want to resell this Software or a derivative you must get permission from Low Power Lab LLC.
// - You must maintain the attribution and copyright notices in any forks, redistributions and
//   include the provided links back to the original location where this work is published,
//   even if your fork or redistribution was initially an N-th tier fork of this original release.
// - You must release any derivative work under the same terms and license included here.
// - This Software is released without any warranty expressed or implied, and Low Power Lab LLC
//   will accept no liability for your use of the Software (except to the extent such liability
//   cannot be excluded as required by law).
// - Low Power Lab LLC reserves the right to adjust or replace this license with one
//   that is more appropriate at any time without any prior consent.
// Otherwise all other non-conflicting and overlapping terms of the GPL terms below will apply.
// ********************************************************************************************
// This program is free software; you can redistribute it and/or modify it under the terms 
// of the GNU General Public License as published by the Free Software Foundation;
// either version 3 of the License, or (at your option) any later version.                    
//                                                        
// This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
// without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
// See the GNU General Public License for more details.
//                                                        
// You should have received a copy of the GNU General Public License along with this program.
// If not license can be viewed at: http://www.gnu.org/licenses/gpl-3.0.txt
//
// Please maintain this license information along with authorship
// and copyright notices in any redistribution of this code
// **********************************************************************************
-->
<html lang="en">
<head>
  <title>Moteino Gateway</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" href="images/favicon.ico" type="image/x-icon">
  <script src="https://cdn.socket.io/socket.io-1.2.1.js"></script>
  <link rel="stylesheet" href="https://code.jquery.com/mobile/1.4.5/jquery.mobile-1.4.5.min.css" />
  <script src="https://code.jquery.com/jquery-1.11.1.min.js"></script>
  <script src="https://code.jquery.com/mobile/1.4.5/jquery.mobile-1.4.5.min.js"></script>
  <script language="javascript" type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/flot/0.8.3/jquery.flot.min.js"></script>
  <script language="javascript" type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/flot/0.8.3/jquery.flot.time.min.js"></script>
  <script language="javascript" type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/flot/0.8.3/jquery.flot.selection.min.js"></script>
  <script language="javascript" type="text/javascript" src="graphHelper.js"></script>

  <style type="text/css">
  .ui-content { padding-top:0; }
  .btn-text, #loadingsocket { font-size: 32px; }
  #loadingsocket, #loadinggraph {padding:15px;}
  .labelbold { font-weight:bold !important; }
  #wrap { padding: 12px; }
  .ui-listview>li.hiddenNode { display:none; }
  .ui-listview>li.hiddenNodeShow { display:block; }
  .ui-li-count18 { font-size:18px; }
  .ui-li-count16 { font-size:16px; }
  .ui-li-countSTATIC {
    position:static !important;
    float:right;
    font-size:16px;
  }

  .center-div{ margin: 0 auto; }
  .center-wrapper{ text-align: center; }
  .center-wrapper * { margin: 0 auto; }
  #nodeControls { padding: 0 0.5em 0 0.5em; }
  .listIcon20px { max-width:20px; }
  .ui-slider { width: 10em !important; }
  
  textarea.ui-input-text {
    height:auto;
    font-size:15px;
    font-weight:bold;
    font-family:Courier New;
  }

  .icon {
    display:inline-block;
    white-space:nowrap;
    max-width:20px;
    max-height:20px;
  }
  
  .nodeDetailLabel {
    float:left;
    font-weight:bold;
    width: 110px;
  }
  
  .lowbatt {
    background:red;
    color:white;
    font-weight:bold;
    display:none;
  }
  
  /*styling of inline raw action controls*/
  .rawAction .ui-mini { margin:0; }
  .rawAction .ui-btn { margin:0; padding: .3em 0; }
  .rawAction a { margin:4px 0; }
  #rawActionIDspan {
      padding: 12px 0 12px 12px;
      float:left;
      width:15%;
  }
  #rawActionTextspan {
      padding: 12px 0;
      float:left;
      width:55%;
  }
  #rawActionSendspan {
      padding: 12px 12px 12px 0;
      float:left;
      width:20%;
  }
  #rawActionIDspan div { border-radius: 0.3em 0 0 0.3em; }
  #rawActionTextspan div { border-radius: 0; }
  #rawActionSend { border-radius: 0 0.3em 0.3em 0; }
  </style>
</head>
<body>
  <div data-role="page" id="homepage">
    <div data-role="header">
      <a href="http://lowpowerlab.com/gateway" target="new" data-role="none"><img src="images/logo.png" alt="LowPowerLab" title="LowPowerLab.com" style="float:left;display:inline;max-width:30px;padding:4px"/></a>
      <h1>Moteino Gateway</h1>
      <div class="ui-btn-right" data-role="controlgroup" data-type="horizontal" data-mini="true">
        <a id="btnHiddenNodesToggle" href="#" data-role="button" data-icon="eye" data-iconpos="notext">Show hidden</a>
        <a id="btnSearch" href="#" data-role="button" data-icon="search" data-iconpos="notext">Search</a>
        <a href="#logpage" data-role="button" data-icon="bars" data-iconpos="notext">Log</a>
      </div>
    </div>

    <div id="loader" class="center-wrapper">
      <div style="padding:20px 0">
        <a href="http://lowpowerlab.com/gateway" target="new" data-role="none"><img src="images/logo.png" alt="LowPowerLab" title="LowPowerLab.com" style="max-width:100px;padding:4px"/></a>
      </div>
      
      <div class="ui-content center-div">
        <span id="loadingSocket" style="font-weight:bold">Waiting for socket connection..</span>
        <br/>
        <div style="padding:20px 0">
          <img src="images/loading.gif" />
        </div>
      </div>
    </div>
      
    <div data-role="main" class="ui-content">
      <form id="searchBox" class="ui-filterable" style="display:none">
        <input id="filter" data-type="search" placeholder="Search nodes..">
      </form>
      <ul id="nodeList" data-role="listview" data-inset="true" data-filter="true" data-input="#filter" data-theme="a" data-dividertheme="b"></ul>
    </div>

    <div data-role="footer">
      <h1><span style="font-size:11px">© <a href="http://lowpowerlab.com">LowPowerLab.com</a> 2015. All rights reserved. <a href="http://lowpowerlab.com/gateway">About</a></span></h1>
    </div>
  </div>
  
  <div data-role="page" id="nodedetails">
    <div data-role="header">
      <h3><span id="nodeDetailTitle">Node details</span> <span class="nodeUpdated">x</span></h3>
      <a id="node_update" href="#homepage" class="ui-btn ui-btn-inline ui-btn-b ui-shadow ui-corner-all ui-icon-home ui-btn-icon-left ui-mini ui-btn-notext">Home</a>
      
      <div class="ui-btn-right" data-role="controlgroup" data-type="horizontal">
        <a href="#deleteNode" class="ui-btn ui-btn-inline ui-corner-all ui-icon-delete ui-btn-icon-left ui-mini" data-transition="fade">Delete</a>
      </div>
    </div>
    <div data-role="main" class="ui-content">
      <div class="ui-field-contain">
        <label for="nodeMoteType" class="labelbold">Type:</label>
        <select id="nodeMoteType" data-mini="true"></select>
        <label for="nodeLabel" class="labelbold">Label:</label>
        <input type="text" name="nodeLabel" id="nodeLabel" placeholder="node label..." />
        <label for="nodeDescr" class="labelbold">Description:</label>
        <input type="text" name="nodeDescr" id="nodeDescr" placeholder="description/location..." />
        <label for="nodeHidden" class="labelbold">Visibility:</label>
        <select name="nodeHidden" id="nodeHidden" data-role="slider" data-mini="true">
          <option value="0">visible</option>
          <option value="1">hidden</option>
        </select> 
      </div>
      <ul id="metricList" data-role="listview" data-inset="true" data-theme="a" data-dividertheme="b"></ul>
      
      <div class="center-wrapper">
        <div id="nodeControls" class="center-div">
        <!--
        <div id="nodeControls" data-role="controlgroup" data-type="horizontal">
          <a href="#" data-role="button" data-icon="search">X</a>
          <a href="#" data-role="button" data-icon="bars">Y</a>
          <a href="#" data-role="button" data-icon="search">Z</a>
          -->
        </div>
      </div>

      <ul id="eventList" data-role="listview" data-inset="true" data-theme="a" data-dividertheme="b"></ul>
      
      <div class="center-wrapper" style="margin-top:10px">
        <div id="nodeEvents" class="center-div">
          <div id="nodeControls" data-role="controlgroup" data-type="horizontal">
            <a id="addNodeEvent" href="#addEvent" data-role="button" data-icon="plus" style="background-color:#9BFFBE">Event</a>
          </div>
        </div>
      </div>

      <span class="nodeDetailLabel">Node ID:</span><span class="nodeID">x</span><br/>
      <!--<span class="nodeDetailLabel">Updated:</span><span class="nodeUpdated">x</span><br/>-->
      <!--<div class="nodeBattWrap"><span class="nodeDetailLabel">Battery:</span><span class="nodeBatt">x</span></div>-->
      <span class="nodeDetailLabel">RSSI:</span><span class="nodeRSSI">x</span><br/>
    </div>
  </div>

  <div data-role="page" id="addEvent" data-dialog="true">
    <div data-role="main" class="ui-content">
      <div class="center-wrapper" style="padding:20px">
        <h3>Pick the event type:</h3>
      </div>
      <select id="addEventType" data-mini="true"></select>
      <div class="center-wrapper" style="padding:8px; font-size:12px; font-weight:bold; color:red"><span id="addEventDescr">&nbsp;</span></div>
      <div class="center-wrapper">
        <a id="addEvent_OK" href="#nodedetails" class="ui-btn ui-btn-inline ui-btn-b ui-shadow ui-corner-all ui-icon-check ui-btn-icon-left ui-mini" data-rel="nodedetails" style="background-color:#9BFFBE;color:#000">Add</a>
        <a href="#" class="ui-btn ui-btn-inline ui-shadow ui-corner-all ui-mini ui-icon-back ui-btn-icon-left" data-rel="back">Cancel</a>
      </div>
    </div>
  </div>

  <div data-role="page" id="metricdetails">
    <div data-role="header">
      <h3><span id="metricDetailTitle">Metric details</span> <span class="metricUpdated">x</span></h3>
      <a id="metric_return" href="#" class="ui-btn ui-btn-inline ui-btn-b ui-shadow ui-corner-all ui-icon-back ui-btn-icon-left ui-mini" data-rel="back">Node</a>
      <div class="ui-btn-right" data-role="controlgroup" data-type="horizontal">
        <a href="#deleteMetric" class="ui-btn ui-btn-inline ui-corner-all ui-icon-delete ui-btn-icon-left ui-mini" data-transition="fade">Delete</a>
      </div>
    </div>
    <div data-role="main" class="ui-content">
      <div class="ui-field-contain">
        <label for="metricLabel" class="labelbold">Label:</label>
        <input type="text" name="metricLabel" id="metricLabel" placeholder="metric label..." />
        <label for="metricValue" class="labelbold">Value:</label>
        <input type="text" name="metricValue" id="metricValue" placeholder="value" readonly />
        <label for="metricPinned" class="labelbold">Pinned:</label>
        <select name="metricPinned" id="metricPinned" data-role="slider" data-mini="true">
          <option value="0">off</option>
          <option value="1">pinned</option>
        </select>
        <img id="metricPinIcon" class="icon" src="images/pin.png" style="display:none" />
      </div>
      <div id="metricGraphedWrapper" class="ui-field-contain">
        <label for="metricGraphed" class="labelbold">Graph:</label>
        <select name="metricGraphed" id="metricGraphed" data-role="slider" data-mini="true">
          <option value="0">no</option>
          <option value="1">yes</option>
        </select>
        <img id="metricGraphedIcon" class="icon" src="images/graph.png" style="display:none" />
      </div>
      <div id="metricGraphWrapper" style="width:100%; height:280px;">
        <div id="metricGraph"></div>
        <div id="graphControls" data-role="controlgroup" data-type="horizontal" style="text-align:center;margin:auto">
          <!--<a class="graphControl" href="#" data-role="button" hours="720" data-icon="calendar" data-theme="b">M</a>-->
          <a class="graphControl" href="#" data-role="button" hours="168" data-icon="calendar" data-theme="b">W</a>
          <a class="graphControl" href="#" data-role="button" hours="24" data-icon="calendar" data-theme="b">D</a>
          <a class="graphControl" href="#" data-role="button" hours="1" data-icon="calendar" data-theme="b">H</a>
          <a id="graphZoomIn" href="#" data-role="button" data-icon="plus" data-iconpos="notext" data-theme="b">ZoomIn</a>
          <a id="graphZoomOut" href="#" data-role="button" data-icon="minus" data-iconpos="notext" data-theme="b">ZoomOut</a>
          <a id="graphPanLeft" href="#" data-role="button" data-icon="arrow-l" data-iconpos="notext" data-theme="b">Left</a>
          <a id="graphPanRight" href="#" data-role="button" data-icon="arrow-r" data-iconpos="notext" data-theme="b">Right</a>
          <a id="graphReset" href="#" data-role="button" data-icon="refresh" data-iconpos="notext" data-theme="b">Reset</a>
        </div>
      </div>
      <div class="center-wrapper">
        <div ui-role="loadinggraph" class="ui-content center-div" style="padding-top:40px">
          <span id="loadinggraph" style="font-weight:bold">Loading graph...</span>
          <br/>
          <img src="images/loading.gif" />
        </div>
      </div>
     </div>
  </div>

  <div data-role="page" id="deleteNode" data-dialog="true">
    <div data-role="main" class="ui-content">
      <div class="center-wrapper" style="padding:20px">
        <h3>Are you sure you want to remove this node?</h3>
      </div>
      <div class="center-wrapper"><span style="padding:10px">Further data from node will make it appear again.</span></div>
      <div class="center-wrapper" style="padding:20px">
        <a id="deleteNode_yes" href="#homepage" class="ui-btn ui-btn-inline ui-btn-b ui-shadow ui-corner-all ui-icon-check ui-btn-icon-left ui-mini" data-rel="homepage" style="background: red; color: white;">Delete</a>
        <a href="#" class="ui-btn ui-btn-inline ui-shadow ui-corner-all ui-mini ui-icon-back ui-btn-icon-left" data-rel="back">Cancel</a>
      </div>
    </div>
  </div>

  <div data-role="page" id="deleteMetric" data-dialog="true">
    <div data-role="main" class="ui-content">
      <h3>Are you sure you want to remove this metric?</h3>
      <span>Further data from metric will make it appear again.</span><br />      
      <a id="deleteMetric_yes" href="#nodedetails" class="ui-btn ui-btn-inline ui-btn-b ui-shadow ui-corner-all ui-icon-check ui-btn-icon-left ui-mini" data-rel="nodedetails" style="background: red; color: white;">Delete</a>
      <a href="#" class="ui-btn ui-btn-inline ui-shadow ui-corner-all ui-mini ui-icon-back ui-btn-icon-left" data-rel="back">Cancel</a>
    </div>
  </div>

  <div data-role="page" id="logpage">
    <div data-role="header">
      <a href="#homepage" class="ui-btn ui-corner-all ui-shadow ui-icon-home ui-btn-icon-left">Home</a>
      <h1>Raw data log</h1>
      <div class="ui-btn-right" data-role="controlgroup" data-type="horizontal" data-mini="true">
        <a id="btnRawToggle" href="#" data-role="button" data-icon="arrow-u" data-iconpos="notext">Raw send</a>
        <a id="clearbtn" href="#" data-role="button" data-icon="delete" data-iconpos="notext">Clear</a>
      </div>
    </div>

    <div class="rawAction" style="display:none">
      <span id="rawActionIDspan">
        <input type="text" id="rawActionID" data-mini="true" placeholder="node ID" />
      </span>
      <span id="rawActionTextspan">
         <input type="text" id="rawActionText" data-mini="true" placeholder="message..." />
      </span>
      <span id="rawActionSendspan">
        <a id="rawActionSend" data-role="button">Send</a>
      </span>
    </div>

    <div id="wrap">
      <textarea name="log" id="log" rows="10" style="font-size:10px;"></textarea>
    </div>
  </div>

  <script type="text/javascript">
  $(function(){
    var nodes = {};        //this holds the current nodes data
    var selectedNodeId;    //points to the selected node ID
    var selectedMetricKey; //points to the selected metric name of the selected node
    var motesDef;          //holds the definition of the motes (from server side metrics.js)
    var metricsDef;        //holds the definition of the metrics (from server side metrics.js)
    var eventsDef;
    var showHiddenNodes=false, showRawSend=false;
    var socket = io.connect('<?php echo $_SERVER['HTTP_HOST']; ?>', {'connect timeout': 1000}); //limit chrome xhr-polling fall back delay
    $('#nodeList').hide();
    
    function LOG(data) {
      $('#log').val(new Date().toLocaleTimeString() + ' : ' + data + '\n' + $('#log').val());
      if ($('#log').val().length > 5000) $('#log').val($('#log').val().slice(0,5000));
    };
    
    socket.on('connect', function(){
      LOG('Connected!');
      $('#loadingSocket').html('<span style="color:#2d0">Connected!</span><br/><br/>Waiting for data..');
    });

    socket.on('disconnect', function () {
      $('#log').val(new Date().toLocaleTimeString() + ' : Disconnected!\n' + $('#log').val());
      $("#loader").show();
      $('#loadingSocket').html('Socket was <span style="color:red">disconnected.</span><br/><br/>Waiting for socket connection..');
      if ($.mobile.activePage.attr('id') != 'homepage')
        $.mobile.navigate('#homepage', { transition : 'slide'});
      $('#nodeList').hide();
    });
    
    socket.on('UPDATENODE', function(entry) {
      updateNode(entry);
      refreshNodeListUI();
    });
    
    socket.on('UPDATENODES', function(entries) {
      $("#loader").hide();
      $("#nodeList").empty();
      $('#nodeList').append('<li id="uldivider" data-role="divider"><h2>Nodes</h2><span class="ui-li-count ui-li-count16">Count: 0</span></li>');
      $('#nodeList').show();
      entries.sort(function(a,b){ if (a.label && b.label) return a.label < b.label ? -1 : 1; if (a.label) return -1; if (b.label) return 1; return a._id > b._id; });
      for (var i = 0; i < entries.length; ++i)
        updateNode(entries[i]);
      refreshNodeListUI();
      if ($.mobile.activePage.attr('id') != 'homepage')
        $.mobile.navigate('#homepage', { transition : 'slide'});
    });
    
    socket.on('MOTESDEF', function(motesDefinition) {
      motesDef = motesDefinition;
      $("#nodeMoteType").empty();
      $('#nodeMoteType').append('<option value="">Select type...</option>');
      for(var mote in motesDef)
        $('#nodeMoteType').append('<option value="' + mote + '">' + motesDef[mote].label || mote + '</option>');
      $("#nodeMoteType").selectmenu();
    });
    
    socket.on('METRICSDEF', function(metricsDefinition) {
      metricsDef = metricsDefinition;
    });
    
    socket.on('EVENTSDEF', function(eventsDefinition) {
      eventsDef = eventsDefinition;
      $('#addEventType').change(function() {
        if ($(this).val())
        {
          $('#addEventDescr').html('<span style="color:#000">Action: </span>' + (eventsDef[$(this).val()].icon ? '<span class="ui-btn-icon-notext ui-icon-'+eventsDef[$(this).val()].icon+'" style="position:relative;float:left"></span>' : '') + (eventsDef[$(this).val()].descr || key));
          $('#addEvent_OK').show();
        }
        else {
          $('#addEventDescr').html(' ');
          $('#addEvent_OK').hide();
        }
      });
    });
    $(document).on("pagecreate", "#eventAdd", function(){ if ($('addEventType').val()) $('#addEvent_OK').show(); else $('#addEvent_OK').hide(); });
    
    socket.on('LOG', function(data) {
      LOG(data);
    });
    
    socket.on('PLAYSOUND', function (soundFile) {
      new Audio(soundFile).play();
    });
    
    // //copies properties of newPropertiesObj into originalObj and returns the result as new object; existing properties are overwritten
    // function copyProperties(originalObj, newPropertiesObj)
    // {
      // var result = $.extend(true, {}, originalObj);
      // for (var prop in newPropertiesObj) {
        // if (newPropertiesObj.hasOwnProperty(prop)) {
          // result[prop] = newPropertiesObj[prop];
        // }
      // }
      // return result;
    // }
    
    graphData=[];
    metricGraphWrapper = $('#metricGraphWrapper');
    metricGraph = $('#metricGraph');
    var plot;

    var graphOptions;

    $("#metricdetails").on("pagebeforeshow",function(event){
      $('#metricPinned').slider('refresh');
      $('#metricGraphed').slider('refresh');
    });

    function renderPlot() {
      metricGraphWrapper.show();
      $("div[ui-role='loadinggraph']").hide();
      metricGraph.width(metricGraphWrapper.width()).height(metricGraphWrapper.height() - $('#graphControls').height()); //this assumes the 'pageshow' page event already happened, otherwise will fail to set the width correctly and should be moved in that event
      plot = $.plot(metricGraph, [graphData], graphOptions);

      //graph value tooltips
      metricGraph.bind("plothover", function (event, pos, item) {
        if (item) {
          var val = item.datapoint[1].toFixed(2);
          $("#tooltip").html(val)
            .css({top: item.pageY-25, left: item.pageX+5})
            .fadeIn(200);
        } else
          $("#tooltip").hide();
      });
      
      $(document).off("pageshow", "#metricdetails", renderPlot);
    }

    function refreshGraph() {
      graphData = [];
      graphOptions = {
        lines: {show: true, steps: true, fill:true },
        xaxis: { mode: "time", timezone: "browser", min:graphView.start, max:graphView.end},
        grid: {hoverable: true, clickable: true, backgroundColor: {colors:['#000', '#666']}},
        selection: { mode: "x" },
        //series: { colors: [{ opacity: 0.8 }, { brightness: 0.6, opacity: 0.8 } ]},
        //bars: { show: true, lineWidth: 0, fill: true, fillColor: { colors: [ { opacity: 0.8 }, { opacity: 0.1 } ] } },
        //points: { show: true, radius: 2 },
        //{series: { points: { show: true, radius: 2 } }, grid: { hoverable: true }}
      };
      
      //ask socket for the data
      socket.emit('GETGRAPHDATA', selectedNodeId, selectedMetricKey, graphView.start, graphView.end);
    }
    
    socket.on('GRAPHDATAREADY', function(rawData){
      graphData = [];
      LOG('Got ' + rawData.data.length + ' graph data points...');
      for(var key in rawData.data)
        graphData.push([rawData.data[key]._id, rawData.data[key].v]);
      graphOptions.xaxis.min = graphView.start;
      graphOptions.xaxis.max = graphView.end;
      graphOptions = $.extend(true, graphOptions, rawData.options); //http://stackoverflow.com/questions/171251/how-can-i-merge-properties-of-two-javascript-objects-dynamically
      
      //need to defer plotting until after pageshow is finished rendering, otherwise the wrapper will return an incorrect width of "100"
      if (metricGraphWrapper.width()==100)
        $(document).on("pageshow", "#metricdetails", renderPlot);
      else renderPlot();
    });
    
    $(window).resize(function(){
      if ($.mobile.activePage.attr('id') == 'metricdetails' && nodes[selectedNodeId].metrics[selectedMetricKey].graph && metricGraph.is(':visible'))
      {
        metricGraph.width(metricGraphWrapper.width());
        graphOptions.xaxis.min = graphView.start;
        graphOptions.xaxis.max = graphView.end;
        plot = $.plot(metricGraph, [graphData], graphOptions);
      }
    });
    
    $(window).on("navigate", function(event, data) { $("#tooltip").hide(); }); //hide graph tooltip on any navigation
    
    $("#graphZoomIn").click(function () {graphView.zoomin(); refreshGraph();});
    $("#graphZoomOut").click(function () {graphView.zoomout(); refreshGraph();});
    $('#graphPanRight').click(function () {graphView.panright(); refreshGraph();});
    $('#graphPanLeft').click(function () {graphView.panleft(); refreshGraph();});
    $('#graphReset').click(function () {graphView.resetDomain(); refreshGraph();});
    $('.graphControl').click(function () {graphView.setDomain($(this).attr("hours")); refreshGraph();});
    metricGraph.bind("plotselected", function (event, ranges)
    {
        graphView.start = ranges.xaxis.from;
        graphView.end = ranges.xaxis.to;
        refreshGraph();
    });
    
    function addGraphDataPoint(point) {
      graphData.push(point);
      if (graphData.length > 10)
        graphData.shift();
      graphOptions.xaxis.min = graphView.start = graphData[0][0];
      graphOptions.xaxis.max = graphView.end = graphData[graphData.length-1][0];
      plot = $.plot(metricGraph, [graphData], graphOptions);
      //redraw alternative:
      //plot.setData([graphData]);
      //plot.setupGrid(); //only necessary if your new data will change the axes or grid
      //plot.draw();
    }

    function metricsValues(metrics) {
      var label = '';
      var metric;
      for(var key in metrics)
      {
        metric = metrics[key];
        if(metric.pin=='1' || metrics.length==1)
        {
          var agoText = ago(metric.updated).text;
          //metric.value + (metric.unit || '')
          var metricValue = (metric.unit) ? (metric.value + (metric.unit || '')) : ((metric.descr || metric.name || '') + metric.value);
          label += '<span data-time="'+metric.updated+'" class="nodeMetricAgo" style="color:'+ago(metric.updated).color+'" title="'+agoText+'">'+metricValue+'</span> ';
        }
      }
      label=label.trim();
      return label;
    }

    function getNodeIcon(nodeType) {
      if (motesDef != undefined && nodeType != undefined && motesDef[nodeType] != undefined)
        return motesDef[nodeType].icon || 'icon_default.png';
      return 'icon_default.png';
    };
    
    function resolveRSSIImage(rssi)
    {
      if (rssi == undefined) return '';
      var img;
      if (Math.abs(rssi) > 95) img = 'icon_rssi_7.png';
      else if (Math.abs(rssi) > 90) img = 'icon_rssi_6.png';
      else if (Math.abs(rssi) > 85) img = 'icon_rssi_5.png';
      else if (Math.abs(rssi) > 80) img = 'icon_rssi_4.png';
      else if (Math.abs(rssi) > 75) img = 'icon_rssi_3.png';
      else if (Math.abs(rssi) > 70) img = 'icon_rssi_2.png';
      else img = 'icon_rssi_1.png';
      return '<img class="listIcon20px" src="images/'+img+'" title="RSSI:-'+Math.abs(rssi)+'" />';
    }

    function updateNode(node) {
      LOG(JSON.stringify(node));
      if (node._id)
      {
        nodes[node._id] = node;
        var nodeValue = metricsValues(node.metrics);
        var lowBat = node.metrics.V != null && node.metrics.V.value < 3.55;
        var newLI = $('<li id="' +  node._id + '"><a node-id="' + node._id + '" href="#nodedetails" class="nodedetails"><img class="productimg" src="images/'+getNodeIcon(node.type)+'"><h2>' + (node.label || node._id) + ' ' + resolveRSSIImage(node.rssi) + ' ' + (lowBat ? '<img src="images/lowbattery.png" style="max-width:12px"/> ' : '') + ago(node.updated, 0).tag + (node.hidden ? ' <img class="listIcon20px" src="images/icon_hidden.png" />' : '') + '</h2><p>' + (node.descr || '&nbsp;') + '</p>' + (nodeValue ? '<span class="ui-li-count ui-li-count16">' + nodeValue + '</span>' : '') + '</a></li>');
        var existingNode = $('#nodeList li#' + node._id);
        if (node.hidden)
          if (showHiddenNodes)
            newLI.addClass('hiddenNodeShow');
          else
            newLI.addClass('hiddenNode');
        if(existingNode.length)
          existingNode.replaceWith(newLI);
        else $('#nodeList').append(newLI);
        if (node._id == selectedNodeId) refreshNodeDetails(node);
      }
    }
    
    function refreshNodeListUI()
    {
      var hiddenCount = $('.hiddenNode, .hiddenNodeShow').length;
      $('#uldivider span').html('Count: ' + ($('#nodeList li:not(#uldivider)').length) + (hiddenCount > 0 ? ', ' +hiddenCount +' hidden' : ''));
      if (hiddenCount > 0)
        $('#btnHiddenNodesToggle').show();
      else
      {
        showHiddenNodes = false;
        $('#btnHiddenNodesToggle').removeClass('ui-btn-b').hide();
      }
      $('#nodeList').listview('refresh'); //re-render the listview
    }

    function ago(time, agoPrefix)
    {
      agoPrefix = (typeof agoPrefix !== 'undefined') ?  agoPrefix : true;
      var now = new Date().getTime();
      var update = new Date(time).getTime();
      var lastupdate = (now-update)/1000;
      var s = (now-update)/1000;
      var m = s/60;
      var h = s/3600;
      var d = s/86400;
      var updated = s.toFixed(0) + 's';
      if (s <6) updated = 'now';
      if (s>=60) updated = m.toFixed(0)+'m';
      if (h>=2) updated = h.toFixed(0)+'h';
      if (h>=24) updated = Math.floor(d)+'d' + ((s%86400)/3600).toFixed(0) + 'h'; //2d3h = two days and 3 hours ago (51hrs)
      var theColor = 'ff8800'; //dark orange //"rgb(255,125,20)";
      if (s<6) theColor = "00ff00"; //dark green
      if (s<30) theColor = "33cc33"; //green
      else if (s<60) theColor = 'ffcc00'; //light orange
      if (h>=3) theColor = 'ff0000'; //red
      theColor = '#'+theColor;
      updated = updated+(agoPrefix && updated!=='now'?' ago':'');
      return {text:updated,color:theColor,tag:'<span data-time="'+time+'" class="nodeAgo" style="color:'+theColor+';">'+updated+'</span>'};
    }

    function updateAgos()
    {
      $("span.nodeAgo").each(function(){
        var timestamp = parseInt($(this).attr('data-time'));
        var agoResult = ago(timestamp, false);
        $(this).css('color', agoResult.color);
        $(this).html(agoResult.text);
      });
      
      $("span.nodeMetricAgo").each(function(){
        var timestamp = parseInt($(this).attr('data-time'));
        var agoResult = ago(timestamp);
        $(this).css('color', agoResult.color);
        $(this).prop('title', agoResult.text);
      });
    }
    
    //refresh "updated X ago" indicators
    var updateAgosTimer = setInterval(updateAgos,3000);
    
    $("#btnSearch").click("tap", function(event) {
      if ($("#searchBox").is(":visible"))
      {
        $("#searchBox").slideUp('fast');
        $("#btnSearch").removeClass('ui-btn-b');
      }
      else
      {
        $("#searchBox").slideDown('fast');
        $("#btnSearch").addClass('ui-btn-b');
      }
    });
    
    $("#btnHiddenNodesToggle").click("tap", function(event) {
      if (showHiddenNodes)
      {
        $(".hiddenNodeShow").removeClass('hiddenNodeShow').addClass('hiddenNode');
        $("#btnHiddenNodesToggle").removeClass('ui-btn-b');
        showHiddenNodes = false;
      }
      else
      {
        $(".hiddenNode").removeClass('hiddenNode').addClass('hiddenNodeShow');
        $("#btnHiddenNodesToggle").addClass('ui-btn-b');
        showHiddenNodes = true;
      }
    });
    
    $("#btnRawToggle").click("tap", function(event) {
      if ($(".rawAction").is(":visible"))
      {
        $(".rawAction").slideUp('fast');
        $("#btnRawToggle").removeClass('ui-btn-b');
      }
      else
      {
        $(".rawAction").slideDown('fast');
        $("#btnRawToggle").addClass('ui-btn-b');
      }
    });
       
    function refreshNodeDetails(node) {
      $('#nodeLabel').val(node.label || '');
      $('#nodeDetailTitle').html(node.label || 'Node details');
      $('#nodeMoteType').val(node.type || '');
      $("#nodeMoteType").selectmenu('refresh',true);
      $('#nodeDescr').val(node.descr || '');
      $('#nodeHidden').val(node.hidden||0);
      $('#nodeHidden').slider().slider('refresh');
      //$('#nodeHidden').slider('refresh');
      
      $('.nodeID').html(node._id);
      $('.nodeRSSI').html(node.rssi);
      $('.nodeUpdated').html(ago(node.updated, false).tag);
      
      $('#metricList').empty();
      for(var key in node.metrics)
      {
        var metric = node.metrics[key];
        var metricValue = metricsValues([metric]);
        var newLI = $('<li id="' + key + '"><a metric-id="' + key + '" href="#metricdetails" class="metricdetails"><img class="ui-li-icon" src="images/' + (metric.pin==1 ? 'pin.png' : 'blank.png') + '" />' +  metric.label + ' ' + (metric.graph==1 ? '<img style="width:16px" src="images/graph.png" /> ' : '') + ago(metric.updated, 0).tag + '<span class="ui-li-count ui-li-count16">' + metricValue +  '</span></a></li>');
        $('#metricList').append(newLI);
        if (key == selectedMetricKey)
        {
          $('.metricUpdated').html(ago(metric.updated, 0).tag);
          $('#metricValue').val(metric.value + (metric.unit || ''));
          if (metric.graph) addGraphDataPoint([(new Date()).getTime(), metric.value]); //TODO: assumes same timezone as server, update this according to timezone
        }
      }
      $('#metricList').listview().listview('refresh');

      //display events list
      $('#eventList').empty();
      for(var key in node.events)
      {
        var evt = eventsDef[key];
        var enabled = node.events[key];
        if (!evt) continue;
        var newLI = $('<li style="background-color:' + (enabled ? '#2d0' : '#d00') + '"><span class="ui-btn-icon-notext ui-icon-'+ (enabled ? (evt.icon ? evt.icon : 'action') : 'minus') + '" style="position:relative;float:left;padding:15px 10px;"></span><a event-id="' + key + '" href="#" class="eventEnableDisable" style="padding-top:0;padding-bottom:0;"><h2>' + evt.label + '</h2><p>' + (evt.descr || '&nbsp;') + '</p>' + '</a><a event-id="' + key + '" href="#" class="eventDelete" data-transition="pop" data-icon="delete"></a></li>');
        var existingNode = $('#eventList li#evt_' + key);
        if(existingNode.length)
          existingNode.replaceWith(newLI);
        else $('#eventList').append(newLI);
      }
      $('#eventList').listview().listview('refresh');
      
      //handle node controls/buttons
      $('#nodeControls').hide();
      if (motesDef[node.type] && motesDef[node.type].controls)
      {
        var showControls=false;
        $('#nodeControls').empty();
        for (var cKey in motesDef[node.type].controls)
        {
          var control = motesDef[node.type].controls[cKey];
          if (control.showCondition)
          {
            var f = eval('(' + control.showCondition + ')'); //using eval is generally a bad idea but there is no way to pass functions in JSON via websockets so we pass them as strings instead
            if (!f(node)) continue;
          }
          
          for (var sKey in control.states)
          {
            var state = control.states[sKey];
            if (state.condition)
            {
              var f = eval('(' + state.condition + ')'); //using eval is generally a bad idea but there is no way to pass functions in JSON via websockets so we pass them as strings instead
              if (!f(node)) continue;
            }
            var newBtn = $('<a href="#" data-role="button" class="ui-btn ui-btn-inline ui-shadow ui-corner-all">'+state.label+'</a>');
            if (state.css) newBtn.attr('style',state.css);
            if (state.icon)
            {
              newBtn.addClass('ui-btn-icon-left');
              newBtn.addClass('ui-icon-' + state.icon);
            }
            
            newBtn.bind('click', {nodeId:node._id, action:state.action}, function(event) {
             //alert(event.data.action + ' was clicked for node ' + event.data.nodeId);
             socket.emit("NODEACTION", {nodeId:event.data.nodeId, action:event.data.action});
            });
            $('#nodeControls').append(newBtn); ////$('#nodeControls').controlgroup("container").append(newBtn);
            showControls = true;
            break;
          }
        }
        
        if (showControls)
        {
          //$('#nodeControls').controlgroup().controlgroup("refresh");
          //$('#nodeControls').controlgroup('refresh');
          $('#nodeControls').show();
          //$("#nodeControls").trigger('create');
        }
      }
    }

    function refreshMetricDetails(metric) {
      $('#metricDetailTitle').html(metric.label || 'Node details');
      $('.metricUpdated').html(ago(metric.updated, 0).tag);
      $('#metricValue').val(metric.value + (metric.unit || ''));
      $('#metricLabel').val(metric.label || '');
      if (metric.pin=='1')
        $('#metricPinIcon').show();
      else $('#metricPinIcon').hide();
      $('#metricPinned').val(metric.pin||0);
      //$('#metricPinned').slider('refresh');

      graphData=[];
      metricGraphWrapper.hide();
      $('#metricGraphedWrapper').show();
      if (metric.graph==1) {
        $('#metricGraphed').val(metric.graph);
        $('#metricGraphedIcon').show();
        $("div[ui-role='loadinggraph']").show();
        graphView.resetDomain();
        refreshGraph();
      }
      else if (metric.graph==0) {
        $('#metricGraphed').val(metric.graph);
        $('#metricGraphedIcon').hide();
        $("div[ui-role='loadinggraph']").hide();
      }
      else {
        $('#metricGraphedWrapper').hide();
        $("div[ui-role='loadinggraph']").hide();
      }
    }

    $(document).on("click", ".nodedetails", function () {
      var nodeId = $(this).attr('node-id');
      selectedNodeId = parseInt(nodeId);
      var node = nodes[selectedNodeId];
      refreshNodeDetails(node);
    });
    
    $(document).on("click", ".metricdetails", function () {
      var metricKey = $(this).attr('metric-id');
      selectedMetricKey = metricKey;
      var metric = nodes[selectedNodeId].metrics[metricKey];
      refreshMetricDetails(metric);
    });
    
    $(document).on("click", ".eventEnableDisable", function () {
      var eventKey = $(this).attr('event-id');
      socket.emit('EDITNODEEVENT', selectedNodeId, eventKey, !nodes[selectedNodeId].events[eventKey]);
    });
    
    $(document).on("click", ".eventDelete", function () {
      var eventKey = $(this).attr('event-id');
      socket.emit('EDITNODEEVENT', selectedNodeId, eventKey, null, true);
    });

    $('#nodeLabel').keyup(function() {$('#nodeDetailTitle').html($('#nodeLabel').val() || 'no label');});
    $('#metricLabel').keyup(function() {$('#metricDetailTitle').html($('#metricLabel').val() || 'no label');});
    $('#metricPinned').change(function() { if ($(this).val()=='1') $('#metricPinIcon').show(); else $('#metricPinIcon').hide();});
    $('#metricGraphed').change(function() {
      if ($(this).val()=='1') {
        $('#metricGraphedIcon').show();
        if (graphData.length == 0)
        {
          $("div[ui-role='loadinggraph']").show();
          graphView.resetDomain();
          refreshGraph();
        }
        else metricGraphWrapper.show();
      }
      else {
        metricGraphWrapper.hide();
        $('#metricGraphedIcon').hide();
      }
    });
    
    $('#nodeMoteType').change(function(){
      var node = nodes[selectedNodeId];
      notifyUpdateNode();
      refreshNodeDetails(node);
    });
    
    function notifyUpdateNode() {
      var node = nodes[selectedNodeId];
      node.label = $('#nodeLabel').val();
      node.type = $('#nodeMoteType').val();
      node.descr = $('#nodeDescr').val();
      node.hidden = $('#nodeHidden').val() == 1 ? 1 : undefined; //only persist when it's hidden
      if (node.label.trim()=='' || node.label == motesDef[node.type])
        node.label = node.type ? motesDef[node.type].label : node.label;
      socket.emit('UPDATENODESETTINGS', nodes[selectedNodeId]);
    }
    
    $('#addNodeEvent').click("tap", function(event) {
      $('#addEventDescr').html(' ');
      $('#addEvent_OK').hide();
      $("#addEventType").empty();
        $('#addEventType').append('<option value="">Select type...</option>');
        for(var key in eventsDef)
          if (!nodes[selectedNodeId].events || !nodes[selectedNodeId].events[key])
            $('#addEventType').append('<option value="' + key + '">' + (eventsDef[key].label || key) + '</option>');
      
      $(document).on("pagebeforeshow", "#addEvent", function(event){
        $("#addEventType").selectmenu('refresh');
        $("#addEventType").val('');
      });
    });
    
    $("#node_update").click("tap", function(event) {
      notifyUpdateNode();
      //updateNode(nodes[selectedNodeId]); //this will happen when node is sent back by server
      $('#nodeList').listview('refresh');
    });
    
    $("#addEvent_OK").click("tap", function(event) {
      socket.emit('EDITNODEEVENT', selectedNodeId, $('#addEventType').val(), true);
    });

    $("#metric_return,#event_return").click("tap", function(event) {
      var metric = nodes[selectedNodeId].metrics[selectedMetricKey];
      if (metric != undefined)
      {
        metric.label = $('#metricLabel').val();
        metric.pin = $('#metricPinned').val();
        if (metric.graph!=undefined) metric.graph = $('#metricGraphed').val();
        socket.emit('UPDATEMETRICSETTINGS', selectedNodeId, selectedMetricKey, metric);
        //$('#nodeList').listview('refresh');
      }
    });
    
    $("#deleteNode_yes").click("tap", function(event) {
      nodes[selectedNodeId] = undefined;
      $('#nodeList li#' + selectedNodeId).remove();
      socket.emit('DELETENODE', selectedNodeId);
    });
    
    $("#deleteMetric_yes").click("tap", function(event) {
      nodes[selectedNodeId].metrics[selectedMetricKey] = undefined;
      $('#metricList li#' + selectedMetricKey).remove();
      socket.emit('DELETENODEMETRIC', selectedNodeId, selectedMetricKey);
    });
   
    $("#clearbtn").click("tap", function(event) {
      $('#log').val('');
    });
    
    $("#rawActionTextspan").keypress(function(event) {
      if (event.which == 13) //if ENTER pressed in the message box .. then "click" the SEND button
      {
        $("#rawActionSend").click();
        return false;  
      }
    });
    
    $("#rawActionSend").click("tap", function(event) {
      //LOG(JSON.stringify({nodeId:$("#rawActionID").val(), action:$("#rawActionText").val()}));
      socket.emit("NODEACTION", {nodeId:$("#rawActionID").val(), action:$("#rawActionText").val()});
    });
    
    //enforce positive numeric input
    $("#rawActionID").on("keypress keyup blur",function (event) {    
      $(this).val($(this).val().replace(/[^\d].+/, ""));
      if ((event.which < 48 || event.which > 57) || $(this).val().length > 3) {
        event.preventDefault();
      }
      //max node ID is 255 with packet header defaults in RFM69 library
      if ($(this).val() > 255) $(this).val(255);
    });
    
    //graph value tooltips container
    $("<div id='tooltip'></div>").css({
			position: "absolute",
			display: "none",
      fontSize: "11px",
			border: "1px solid #fdd",
			padding: "2px",
			"background-color": "#fee",
			opacity: 0.80
		}).appendTo("body");
  });
  </script>
</body>
</html>