var application = require("application");
var UsageUtil = require("~/util/UsageInformationUtil");
var StorageUtil = require("~/util/StorageUtil");
var fancyAlert = require("nativescript-fancyalert");

var frame = require('ui/frame');
var gestures = require("ui/gestures").GestureTypes;
var builder = require('ui/builder');
var layout = require("ui/layouts/grid-layout");
var timer = require("timer");
var LoadingIndicator = require("nativescript-loading-indicator").LoadingIndicator;

var drawer;
var pkgs;
var toToggle;
var page;
var events;

exports.onUnloaded = function(args) {
  args.object.removeChildren();
};

var createGrid = function(args) {
  var list = UsageUtil.getApplicationList();
  var selectedPackages = StorageUtil.getSelectedPackages();

  list.sort(function(a, b){
    var aIsSelected = selectedPackages.includes(a.packageName);
    var bIsSelected = selectedPackages.includes(b.packageName);

    if (aIsSelected && !bIsSelected) {
      return -1;
    } else if (!aIsSelected && bIsSelected) {
      return 1;
    }  else {
      return a.label < b.label ? -1 : 1;
    }
  });


  var grid = args.object.getViewById('grid');
  list.forEach(function (item, i) {
    if (i % 3 === 0) {
      grid.addRow(new layout.ItemSpec(1, layout.GridUnitType.AUTO));
    }
    grid.addChild(createCell(list[i], Math.floor(i/3), i%3));
  });
};

var setCellInfo = function(cell, info) {
  cell.getViewById("lbl").text = info.label;

  var selector = cell.getViewById("slctr");
  selector.visibility = pkgs.includes(info.packageName) ? 'visible' : 'hidden';

  var image = cell.getViewById("img");
  image.src = info.iconSource;
  image.on(gestures.tap, function() {
    events.push({category: 'features', index: 'watchlist_manage_change'});
    selector.visibility = selector.visibility === 'visible' ? 'hidden' : 'visible';
    toToggle[info.packageName] = !toToggle[info.packageName];
  });

};

var createCell = function(info, r, c)  {
  var cell = builder.load({
    path: 'shared/appgridcell',
    name: 'appgridcell',
    page: page
  });

  setCellInfo(cell, info);
  layout.GridLayout.setRow(cell, r);
  layout.GridLayout.setColumn(cell, c);
  return cell;
};

exports.pageLoaded = function(args) { 
  events = [{category: 'page_visits', index: 'watchlist_manage'}];
  page = args.object;
  toToggle = {};
  drawer = page.getViewById('sideDrawer');
  pkgs = StorageUtil.getSelectedPackages();

  var loader = new LoadingIndicator();
  var options = {
    message: 'Retrieving installed applications...',
    progress: 0.65,
    android: {
      indeterminate: true,
      cancelable: false,
      max: 100,
      progressNumberFormat: "%1d/%2d",
      progressPercentFormat: 0.53,
      progressStyle: 1,
      secondaryProgress: 1
    }
  };
  loader.show(options);

  timer.setTimeout(() => {
    createGrid(args);
    loader.hide();
  }, 1000);
};

exports.toggleDrawer = function() {
  events.push({category: 'navigation', index: 'menu'});
  drawer.toggleDrawerState();
};

exports.onDone = function() {

  var numToRemove = 0;
  var hasAddedPkg = false;
  Object.keys(toToggle).forEach(function(key) {
    if (!hasAddedPkg && toToggle[key]) {
      if (pkgs.includes(key)) {
        numToRemove++;
      } else {
        hasAddedPkg = true;
      }
    }
  });

  if (hasAddedPkg || (numToRemove !== pkgs.length && pkgs.length !== 0)) {
    var wasChanged = false;
    Object.keys(toToggle).forEach(function(key) {
      if (toToggle[key]) {
        StorageUtil.togglePackage(key);
        wasChanged = true;
      }
    });
    frame.topmost().goBack();
  } else {
    fancyAlert.TNSFancyAlert.showError("Uh Oh!", "Please select at least one app to monitor!", "Okay");
  }

};

exports.pageUnloaded = function(args) {
  StorageUtil.addLogEvents(events);
};