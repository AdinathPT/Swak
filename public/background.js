import {memoryLeakLogger,sendScoutToGetDom} from "../src/utils/service"
// 1. Set the alarm when the extension is first installed or updated
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("leakDetectorLoop", { 
    periodInMinutes: 5 // Fires exactly every 5 minutes
  });
});

// 2. Listen for the alarm to ring
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "leakDetectorLoop") {
    console.log("Waking up to check for memory leaks...");
    
    // 3. Wake up the Brain, find all awake tabs
    const allTabs = await chrome.tabs.query({ discarded: false });
    
    // 4. Send the Scouts into the awake tabs to log their DOM sizes
    for (const tab of allTabs) {
       // Make sure to skip chrome:// URLs here too!
       if (!tab.url.startsWith("chrome://")) {
           const domCount = await sendScoutToGetDom(tab.id);
           
           // This is the function that saves to chrome.storage.session
           const isLeaking = await memoryLeakLogger(tab.id, domCount);
           
           if (isLeaking) {
               console.warn(`WARNING: Memory Leak detected in Tab ${tab.id}!`);
               // You could optionally auto-discard it here to save the computer:
               // chrome.tabs.discard(tab.id);
           }
       }
    }
  }
});