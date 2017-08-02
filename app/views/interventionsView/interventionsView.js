var StorageUtil = require("~/util/StorageUtil");
var IM = require('~/interventions/InterventionManager');
var ID = require('~/interventions/InterventionData');
var Toast = require('nativescript-toast');

var gestures = require("ui/gestures").GestureTypes;
var builder = require('ui/builder');
var frame = require('ui/frame');

var drawer;
var page;
var interventionList;

var createItem = function(info)  {
  var item = builder.load({
    path: 'shared/detailelem',
    name: 'detailelem'
  });

  item.id = 'item' + item.id;
  item.className = 'intervention-grid';
  item.getViewById('firstrow').className = info.level + '-level';
  
  var image = item.getViewById('icon');
  image.src = info.icon;
  image.className = 'intervention-icon';

  var label = item.getViewById("name");
  label.text = info.name;
  label.className = 'intervention-label';

  item.on("tap, touch", function(args) {
    if (args.eventName === 'tap') {
      var options = {
        moduleName: 'views/detailView/detailView',
        context: {
          info: info
        }
      };
      frame.topmost().navigate(options);
    } else {
      if (args.action === 'down') {
        item.backgroundColor = '#F5F5F5';
      } else if (args.action === 'up' || args.action === 'cancel') {
        item.backgroundColor = '#FFFFFF';
      }
    }
  });

  var sw = item.getViewById("switch");
  sw.checked = StorageUtil.isEnabledForAll(info.id);
  sw.on(gestures.tap, function() {
    StorageUtil.toggleForAll(info.id);
  });

  return item;
};

var setUpList = function() {
  var layouts = {};
  layouts['toast'] = page.getViewById("toast-interventions");
  layouts['toast'].removeChildren();
  layouts['notification'] = page.getViewById("notification-interventions");
  layouts['notification'].removeChildren();
  layouts['dialog'] = page.getViewById("dialog-interventions");
  layouts['dialog'].removeChildren();
  layouts['overlay'] = page.getViewById("overlay-interventions");
  layouts['overlay'].removeChildren();

  var order = {easy: 0, medium: 1, hard: 2};
  interventionList = ID.interventionDetails.sort(function (a, b) {
    return order[a.level] - order[b.level];
  });

  interventionList.forEach(function (item, index) {
    if (IM.interventions[item.id]) {
      layouts[item.style].addChild(createItem(item));
    }
  });

};

exports.pageLoaded = function(args) {
  page = args.object;
  drawer = page.getViewById('sideDrawer');
  setUpList();
};

exports.toggleDrawer = function() {
  drawer.toggleDrawerState();
};