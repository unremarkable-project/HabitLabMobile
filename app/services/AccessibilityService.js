var application = require("application");
var context = application.android.context;

// utils 
const storage = require("~/util/StorageUtil");
const interventionManager = require("~/interventions/InterventionManager");
const videoBlocker = require("~/overlays/VideoOverlay");

// native APIs
const AccessibilityEvent = android.view.accessibility.AccessibilityEvent;

// packages to ignore (might need to compile a list as time goes on)
const ignore = ["com.sec.android.inputmethod"];



/***************************************
 *           SCREEN RECEIVER           *
 ***************************************/

// logging vars
var screenOnTime = Date.now();

/*
 * ScreenReceiver
 * --------------
 * Receiver that listens to screen on, off, and 
 * unlocked events.
 */
var ScreenReceiver = android.content.BroadcastReceiver.extend({
    onReceive: function(context, intent) {
        var action = intent.getAction();

        if (action === android.content.Intent.ACTION_SCREEN_ON) {
            screenOnTime = Date.now();
            storage.glanced();
            interventionManager.nextScreenOnIntervention();
        } else if (action === android.content.Intent.ACTION_USER_PRESENT) {
            storage.unlocked();
            interventionManager.nextScreenUnlockIntervention();
        } else if (action === android.content.Intent.ACTION_SCREEN_OFF) {
            var now = Date.now();
            closeRecentVisit(now);
            var timeSpentOnPhone = now - screenOnTime;
            storage.updateTotalTime(timeSpentOnPhone);
            interventionManager.removeOverlays();
        }  
    }
});


/**************************************
 *       TRACKING FUNCTIONALITY       *
 **************************************/

// tracking metadata
var currentApplication = {
    packageName: "",
    isBlacklisted: false,
    visitStart: 0
};

var paused = false;
var playNode;

/*
 * AccessibilityService
 * --------------------
 * Service that tracks phone application usage
 * and presents users with series of interventions
 * on blacklisted applications.
 */
android.accessibilityservice.AccessibilityService.extend("com.habitlab.AccessibilityService", {
    onAccessibilityEvent: function(event) {
        var activePackage = event.getPackageName();
        var eventType = event.getEventType();

        if (activePackage === "org.nativescript.HabitLabMobile" || ignore.includes(activePackage)) { return; } // skip over
       
        if (currentApplication.packageName !== activePackage && eventType === AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            interventionManager.removeOverlays();
            interventionManager.resetDurationInterventions();

            console.warn(activePackage);

            var now = Date.now();
            closeRecentVisit(now);
            openNewVisit(now, activePackage);

            if (currentApplication.isBlacklisted) {
                interventionManager.nextOnLaunchIntervention(currentApplication.packageName);
            }
        } else if (currentApplication.isBlacklisted) {
            interventionManager.youTubeVideoBlocker(event.getSource(), currentApplication.packageName); // youtube only
        }
    },

    onInterrupt: function() {
        // do nothing
    },

    onServiceConnected: function() {   
        this.super.onServiceConnected();
        console.warn("Started AccessibilityService");
        setUpScreenReceiver(); // set up unlock receiver on startup
    }
});


var findChildren = function(node) {
    if (!node) { return; }

    if (node.getContentDescription() === "News Feed" || node.getContentDescription() === "Videos" 
        || node.getContentDescription() === "Marketplace") {
        console.warn(node.getContentDescription());
    }

    for (var i = 0; i < node.getChildCount(); i++) {
        return findChildren(node.getChild(i));
    }
}



/*
 * closeRecentVisit
 * ----------------
 * Close the most recent visit to a blacklisted
 * application (if there was one). Send visit 
 * length information to StorageUtil.
 */
function closeRecentVisit(now) {
    if (currentApplication.isBlacklisted) {
        var timeSpent = now - currentApplication.visitStart;
        storage.updateAppTime(currentApplication.packageName, timeSpent);
        console.warn("CLOSING visit to: " + currentApplication.packageName);
    }
}

/*
 * openNewVisit
 * ------------
 * Populate tracking metadata with name of new
 * active package and mark blacklisted applications.
 * Mark the visit start time.
 */
function openNewVisit(now, pkg) {
    currentApplication.packageName = pkg;
    currentApplication.visitStart = now;

    if (storage.isPackageSelected(pkg)) {
        currentApplication.isBlacklisted = true;
        storage.visited(pkg);
        console.warn("OPENING visit to: " + currentApplication.packageName);
    } else {
        currentApplication.isBlacklisted = false;
    }
}


/*
 * setUpScreenReceiver
 * -------------------
 * Register ScreenReceiver object to listen for 
 * screen on, off, and unlock events.
 */
function setUpScreenReceiver() {
    var receiver = new ScreenReceiver();

    var filterOn = new android.content.IntentFilter(android.content.Intent.ACTION_SCREEN_ON);
    var filterOff = new android.content.IntentFilter(android.content.Intent.ACTION_SCREEN_OFF);
    var filterUnlocked = new android.content.IntentFilter(android.content.Intent.ACTION_USER_PRESENT);
    
    context.registerReceiver(receiver, filterOn);
    context.registerReceiver(receiver, filterOff);
    context.registerReceiver(receiver, filterUnlocked);
}


/**
 * markMidnight
 * ------------
 * Function to be called at midnight. Closes any visits that 
 * are active at midnight (so that they are part of that day).
 */
 exports.markMidnight = function () {
    closeRecentVisit(Date.now());
 };


/**
 * enteredHabitlab
 * ---------------
 * Function to be called by the progressView when Habitlab is opened.
 * Allows AccessibilityService to update the current time spent on
 * phone, displayed by the progressView
 */
exports.enteredHabitlab = function () {
    var now = Date.now();
    var timeSpentOnPhone = now - screenOnTime;
    storage.updateTotalTime(timeSpentOnPhone);
    screenOnTime = now;
}

