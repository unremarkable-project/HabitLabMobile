var application = require("application");
var StorageUtil = require("~/util/StorageUtil");
var PermissionUtil = require("~/util/PermissionUtil");
var frameModule = require("ui/frame");
var fancyAlert = require('nativescript-fancyalert');
var page;
var nameField;

exports.pageLoaded = function(args) {
  
	page = args.object;
	nameField = page.getViewById("name");
	nameField.text = StorageUtil.getName() || "";

  // start permission-checking service
  if (!permissionServiceIsRunning()) {
  	var trackingServiceIntent = new android.content.Intent(application.android.context, com.habitlab.PermissionCheckerService.class); 
  	application.android.context.startService(trackingServiceIntent)
  }

  var viewFile = "";
  var view = "";

  if (StorageUtil.isTutorialComplete()) {
    viewFile = 'progressView';
    view = 'progressView';
  } else if (StorageUtil.isOnboardingComplete()) {
    viewFile = 'goalsView';
    view = 'goalsView';
  } else if (PermissionUtil.checkAccessibilityPermission()) {
     viewFile = 'goalsView';
    view = 'goalsView';
    StorageUtil.setOnboardingComplete();
  } else if (PermissionUtil.checkSystemOverlayPermission()) {
    viewFile = 'onboarding/accessibilityPermissionView';
    view = "accessibilityPermissionView"
  }

  if (view) {
    frameModule.topmost().navigate({
      moduleName: 'views/' + viewFile + '/' + view,
      clearHistory: view === 'progressView' || view === 'goalsView'
    });
  }

  StorageUtil.setUpDB();
  StorageUtil.addLogEvents([{setValue: new Date().toLocaleString(), category: 'navigation', index: 'started_onboarding'}]);
};

//Only lets the user continue past the first slide if a name is entered 
// else, a dialog appears
exports.checkNameNextPage = function(args) {
	var name = nameField.text;
	if (name === "") {
	  fancyAlert.TNSFancyAlert.showError("Not so fast!", "Please enter your name to continue", "OK");
	} else {
		StorageUtil.setName(name.trim());
		frameModule.topmost().navigate('views/onboarding/watchlistOnboardingView/watchlistOnboardingView');
	}	
};

var permissionServiceIsRunning = function () {
    var manager = application.android.context.getSystemService(android.content.Context.ACTIVITY_SERVICE);
    var services = manager.getRunningServices(java.lang.Integer.MAX_VALUE);
    for (var i = 0; i < services.size(); i++) {
        var service = services.get(i);
        if (service.service.getClassName() === com.habitlab.PermissionCheckerService.class.getName()) {
            return true;
        }
    }
    return false;
};