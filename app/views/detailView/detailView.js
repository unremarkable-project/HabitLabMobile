var StorageUtil = require('~/util/StorageUtil');
var UsageUtil = require('~/util/UsageInformationUtil');
var IM = require('~/interventions/InterventionManager');

var builder = require('ui/builder');
var gestures = require('ui/gestures').GestureTypes;

var drawer;
var page;
var id;

var createItem = function(pkg)  {
  var item = builder.load({
    path: 'shared/detailelem',
    name: 'detailelem'
  });

  item.id = pkg;
  item.className = 'detail-grid';

  var label = item.getViewById("name");
  label.text = UsageUtil.getAppName(pkg);
  label.className = "detail-label";
  
  item.getViewById("icon").src = UsageUtil.getIcon(pkg);
  //class="thumb img-rounded"
  
  var sw = item.getViewById("switch");
  sw.checked = StorageUtil.isEnabledForApp(id, pkg);
  sw.on(gestures.tap, function() {
    StorageUtil.toggleForApp(id, pkg);
  });

  return item;
};

var setUpDetail = function() {
  page.getViewById('title').text = StorageUtil.interventionDetails[id].name;
  var desc = page.getViewById('description');
  desc.text = StorageUtil.interventionDetails[id].description;
  desc.textWrap = true;

  var level = StorageUtil.interventionDetails[id].level;
  var levelLabel = page.getViewById('level');
  levelLabel.text = level;
  levelLabel.className = level;

  page.getViewById("button").on(gestures.tap, function() {
    var packages = StorageUtil.getSelectedPackages();
    IM.interventions[id]();
  });

  if (StorageUtil.interventionDetails[id].target === 'phone') {
    return;
  }

  var layout = page.getViewById('list');
  var pkgs = StorageUtil.getSelectedPackages();

  var apps = StorageUtil.interventionDetails[id].apps;
  if (apps) {
    pkgs = pkgs.filter(function (item) {
      return apps.includes(item);
    });
  }

  pkgs.forEach(function (pkg) {
    if (!layout.getViewById(pkg)) {
      layout.addChild(createItem(pkg));
    }
  });

};

exports.toggleDrawer = function() {
    drawer.toggleDrawerState();
};

exports.pageLoaded = function(args) {
  page = args.object;
  drawer = page.getViewById("sideDrawer");
  if (page.navigationContext) {
    id = page.navigationContext.id;
  }
  setUpDetail();
};