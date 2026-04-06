// chrome.runtime.onInstalled.addListener(({reason}) => {
//   if (reason === 'install') {
//     chrome.tabs.create({
//       url: "onboarding.html"
//     });
//   }
// });
declare global {
  var LanguageModel: any;
}
interface TabInfoType { 
id: number,
active: boolean,
audible: boolean,
autoDiscardable: boolean,
discarded: boolean,
frozen: boolean,
highlighted: boolean,
incognito: boolean,
mutedInfo: 
{muted: boolean},
pinned: boolean,
selected: boolean,
favIconUrl: string, 
groupId: number,
height:number, 
index:number, 
lastAccessed: number,
splitViewId: number,
status: string,
title: string, 
url: string,
width: number,
windowId: number
}
interface TypesForamttedData {
  id: number,
  title: string,
  url: string,
  favIconUrl: string,
  active: string,
  discarded: boolean,
  rawThreatScore: number,
  ramUsage: number,
}
export const calculateDashboardStats = (tabs: TypesForamttedData[]) => {
  if (!tabs || tabs.length === 0) {
    return { sleeping: 0, duplicates: 0, highRam: 0, highThreat: 0 };
  }
  const sleepingCount = tabs.filter(tab => tab.discarded).length; // Simply count how many are discarded
  const highThreatCount = tabs.filter(tab => tab.rawThreatScore >= 85).length; // Using your existing 'red' threshold (>= 85)
  const highRamCount = tabs.filter(tab => tab.ramUsage >= 70).length; // Tabs using a suspiciously high amount of RAM (e.g., > 10%)
  const urlTracker: Record<string, number> = {}; // A bit of math to count redundant URLs
  let duplicateCount = 0;

  tabs.forEach(tab => {
    // Ignore empty tabs or Chrome settings pages
    if (!tab.url || tab.url.startsWith("chrome://")) return;
    // Tally up how many times each URL appears
    urlTracker[tab.url] = (urlTracker[tab.url] || 0) + 1;
  });

  Object.values(urlTracker).forEach((count: any) => {
    if (count > 1) {
      duplicateCount += (count - 1);
    }
  });

  return {
    sleeping: sleepingCount,
    duplicates: duplicateCount,
    highRam: highRamCount,
    highThreat: highThreatCount
  };
};
// Add this helper function to chop your tabs into manageable pieces
function chunkArray(array: any[], size: number) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

export async function new_LLMGroupNamer(allTabs: any[]) {
  if (typeof LanguageModel === "undefined") return [];

  // 1. Boot the AI EXACTLY ONCE
  console.log("%cWaking up AI model...", "color:blue");
  const session = await LanguageModel.create({ temperature: 0.1, topK: 1 });
  
  // 2. Chop the tabs into chunks of 10 (Fast for local AI to digest)
  const tabChunks = chunkArray(allTabs, 10);
  let masterGroupList: any[] = [];

  try {
    // 3. Loop through the chunks, but use the SAME AI session!
    for (const chunk of tabChunks) {
      const tabData = chunk.map((t: any) => `ID: ${t.id} | Title: ${t.title}`);
      
      const promptText = `
        Categorize these tabs into groups. 
        RESPOND ONLY IN JSON FORMAT: [{"groupName": "Name", "tabIds": [id1, id2]}]
        Tabs:
        ${tabData.join('\n')}
      `;

      console.log(`%cPrompting chunk of ${chunk.length} tabs...`, "color:blue");
      const resultText = await session.prompt(promptText);
      
      const cleanJson = resultText.replace(/```json|```/g, '').trim();
      const parsedGroups = JSON.parse(cleanJson);
      
      masterGroupList = [...masterGroupList, ...parsedGroups];
    }

    // 4. Destroy the AI ONLY when all chunks are done
    session.destroy();
    
    // (Optional: You might want to merge groups here if chunk 1 and chunk 2 both made a "Coding" group)
    return masterGroupList;

  } catch (error) {
    console.warn("AI Prompt failed:", error);
    if (session) session.destroy();
    return [];
  }
}
export async function LLMGroupNamer(tabs: any) {
  if (typeof LanguageModel === "undefined") return [];

  // const availability = await LanguageModel.availability();
  const tabData = tabs.map((t: any) => `ID: ${t.id} | Title: ${t.title}`);
  const session = await LanguageModel.create({
  temperature: 0.1, 
  topK: 1 
});

  // FIX 2: Removed the schema object. We tell it exactly what to do in the text.
  const promptText = `
You are a professional tab organizer. Review these tabs:
${tabData.join('\n')}

Categorize them into logical groups (e.g., "Work", "Social", "Research", "Coding").

CRITICAL INSTRUCTIONS: 
1. You must respond ONLY with a valid JSON array of objects. 
2. MUTUALLY EXCLUSIVE: A tab ID can only belong to EXACTLY ONE group. Never place the same tab ID into multiple groups.
3. You must use exactly this format: [{"groupName": "Name", "tabIds": [id1, id2]}] 
4. A Group Should contain atleast 2 Ids hence make names with respect to this rule But Never place the same tab ID into multiple groups.
5. Make the group Names in one word
  `;

  try {
    console.log(`%cprompting grouping model...`, "color:blue");
    
    // FIX 3: Removed the config object. Just pass the raw text prompt.
    const resultText = await session.prompt(promptText);
    session.destroy();

    // Safety measure: Even if we told it not to, LLMs sometimes add markdown anyway. This strips it.
    const cleanJson = resultText.replace(/```json|```/g, '').trim();
    console.log("cleanJson:",JSON.parse(cleanJson))
    return JSON.parse(cleanJson);

  } catch (error) {
    console.warn("AI Prompt failed:", error);
    if(session) session.destroy();
    
    // FIX 4: Your old catch block returned an object { score: 50... }
    // Since your UI expects an array of groups, returning an object would crash your React map!
    return []; 
  }
}
export async function executeGroupTabs(aiGroups:any[],currentTabs:any) {
  const validTabIds = new Set(currentTabs.map((t:any) => t.id));

  // 2. Loop through the AI's instructions
  for (const group of aiGroups) {
    
    // 3. THE SAFETY CHECK: Filter out any hallucinated or recently closed Tab IDs
    const safeTabIds = group.tabIds.filter((id: number) => validTabIds.has(id));

    // If the AI gave us an empty group or all dead IDs, skip it!
    if (safeTabIds.length === 0) continue;

    try {
      // 4. Physically clamp the tabs together in Chrome
      const newGroupId = await chrome.tabs.group({ 
        tabIds: safeTabIds 
      });
      console.log("GROUP IDs:",newGroupId);
      await chrome.tabGroups.update(
  newGroupId,
   {
     title: group.groupName,
        collapsed: true,
  },
); 
      
    } catch (error) {
      console.error(`Failed to create group ${group.groupName}:`, error);
    }
  }
}
export async function toggleSleep(isDiscarded:boolean,tabId:number) {
  if (isDiscarded) {
    console.log(`%cDiscarded ${tabId}`,"color:blue");
    
    await chrome.tabs.reload(tabId)
  }else{
    console.log(`%Reloaded ${tabId}`,"color:blue");
    await chrome.tabs.discard(tabId)
  }
}
export async function sendScoutToGetDom(tabId:number) {
  try {
    // Inject a tiny script into the page to count all HTML elements
    const injectionResults = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => document.querySelectorAll('*').length,
    });

    // executeScript returns an array (one result per frame). We want the main frame.
    return injectionResults[0].result;
    
  } catch (error) {
    // If the tab is closed before the script runs, or Chrome blocks it, catch the error quietly
    console.warn(`Scout failed to infiltrate tab ${tabId}. It might be a protected page.`);
    return 0; 
  }
}
async function memoryLeakLogger(tabId:number,currDomCount:number):Promise<boolean> {
  const data = await chrome.storage.session.get(tabId.toString()).then((result:any) => {
  return result
});
let history = data[tabId.toString()] || []
history.push(currDomCount)
if(history.length==6){
  history.shift() // keeping only recent 5 data, that is 25min
}
await chrome.storage.session.set({ [tabId.toString()]: history });
//Checks if meemory leaked
const isLeaked = history.forEach((currValue:number,index:number,array:number[]) => {
  index==0 || currValue >= array[index-1]
});
return Boolean(isLeaked)
}
async function LLMPredictUsage(tabTitle:string, tabUrl:string,additional_details:TabInfoType) {
  // 1. Check if the brand new LanguageModel API exists
  if (typeof LanguageModel === "undefined") {
    return { score: 50, classification: "Unknown" }; // Fallback
  }

  // 2. Check availability
  const availability = await LanguageModel.availability();
  if (availability === 'no') {
    return { score: 50, classification: "Unknown (AI Not Supported)" };
  }

  if (availability === 'downloadable' || availability === 'downloading') {
    return { score: 50, classification: "Pending AI Download" };
  }

  // 3. Create the Session
  const session = await LanguageModel.create();

  // 4. Create a strict JSON Schema 
  // This guarantees the AI responds with exactly what we need for our UI!
  const schema = {
    "type": "object",
    "properties": {
      "classification": { 
        "type": "string", 
        "enum": ["Lightweight", "Medium", "Heavy", "Extreme"] 
      },
      "estimatedScore": { 
        "type": "number" // Expecting a number from 0 to 100
      }
    },
    "required": ["classification", "estimatedScore"]
  };

  const promptText = `
    You are a browser performance analyzer. 
    Analyze this tab: Title: "${tabTitle}", URL: "${tabUrl}".
    other than this additional information is also provided here:${additional_details}, this additional details should be given less weightage.
    Based on the domain and title and additional information, predict how heavy this web application is on system RAM and CPU.Can ONLY respond as ["Lightweight", "Medium", "Heavy", "Extreme"] 
  `;

  try {
    // 5. Prompt the AI and pass the schema constraint
    const resultText = await session.prompt(promptText, {
      responseConstraint: schema,
      omitResponseConstraintInput: true // Saves context window space
    });

    // 6. Clean up the session immediately to save RAM
    session.destroy();

    // 7. Parse the perfect JSON!
    return JSON.parse(resultText);

  } catch (error) {
    console.warn("AI Prompt failed:", error);
    if(session) session.destroy();
    return { score: 50, classification: "Unknown" };
  }
}
async function memoryUsageFinalVerdict(Taburl:string,domNodeCount:number,jsHeapMB :number,networkRequests:number,TabInfoDiscarded:boolean,isVideo:boolean,isAudio:boolean,is3D:boolean,isMemoryLeak:boolean,LLMresponse:any):Promise<number>{
    let score = 5; // Every awake tab gets a baseline of 5 points
    const url = Taburl || "";
    if (TabInfoDiscarded) return 0;

    if (
    url.startsWith("chrome://") || 
    url.startsWith("chrome-extension://") || 
    url.startsWith("edge://") || 
    url.includes("chrome.google.com/webstore")
  ) {
    return 5; // Return a safe base score and EXIT immediately
  }
    // Pillar 1: Scaled Heuristics
    score += Math.min((domNodeCount / 1000) * 2, 25);  // Every 1000 DOM nodes = 2 points (Capped at 25 max)
    score += Math.min(jsHeapMB / 15, 20); // Every 15 MB of JS Heap = 1 point (Capped at 20 max)
    score += Math.min(networkRequests / 25, 10);  // Every 25 network requests = 1 point (Capped at 10 max)
    // Pillar 2: Boolean States
    if (isVideo || isAudio) score += 20; // Media is heavy
    if (is3D) score += 25; // GPU rendering is very heavy
    // Pillar 3: AI Blending (Assuming LLM returns 0-100)
    const llmScore = LLMresponse?.estimatedScore || score; 
    
    // hard math 70%, and the AI's intuition 30%
    score = (score * 0.7) + (llmScore * 0.3);

    // Pillar 4: The Leak Override
    // If it's leaking, it's a critical threat regardless of its current size.
    if (isMemoryLeak) {
      score = Math.max(score, 95); 
    }

    // FINAL VERDICT: Round it and enforce the absolute 0-100 boundary
    const finalResult = Math.round(Math.min(score, 100));
    
    return finalResult;
}
async function individualMemoryCalc(TabInfo: TabInfoType): Promise<number> {
  const tabId: number = TabInfo.id;
  const url = TabInfo.url || "";

  // 1) THE SLEEP CHECK (Must be first!)
  if (TabInfo.discarded) return 0;

  // 2) THE BOUNCER (Must be second!)
  if (
    url.startsWith("chrome://") ||
    url.startsWith("chrome-extension://") ||
    url.startsWith("edge://") ||
    url.includes("chrome.google.com/webstore")
  ) {
    return 5; // Return a safe base score and EXIT immediately
  }

  try {
    // 3) Heuristic model
    const _injectionResults = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        return {
          domNodes: document.querySelectorAll('*').length,
          jsHeapBytes: performance?.memory?.usedJSHeapSize || 0,
          isVideo: Array.from(document.querySelectorAll('video')).some(v => !v.paused && !v.ended),
          is3D: Array.from(document.querySelectorAll('canvas')).some(canvas =>
            canvas.getContext('webgl') || canvas.getContext('webgl2')
          ),
          networkRequests: performance.getEntriesByType('resource').length
        };
      }
    });

    console.log("INJECTION results:", _injectionResults);

    // FIXED TYPO: Exactly matching the keys from the return block above!
    const results = _injectionResults[0].result;
    const _rawBytes = results.jsHeapBytes; 
    const domNodeCount = results.domNodes;
    const isVideo = results.isVideo;
    const is3D = results.is3D;
    const networkRequests = results.networkRequests;
    
    // Do the math and convert it to a clean Number right away
    const jsHeapSizeMB = Number((_rawBytes / (1024 * 1024)).toFixed(2));
    const isAudio = TabInfo.audible;

    // 4) ML/LLM model (sync)
    const LLMresponse = LLMPredictUsage(TabInfo.title, TabInfo.url, TabInfo);
    
    // 5) Monotonic Memory Leak
    const isMemoryLeak = await memoryLeakLogger(tabId, domNodeCount);
    //Custom: TODO - add fluctuation based on the difference in the curr and prev DOM nodes 
    // FINAL VERDICT
    // Passed the clean jsHeapSizeMB number!
    const result: number = await memoryUsageFinalVerdict(
      url, 
      domNodeCount, 
      jsHeapSizeMB, 
      networkRequests, 
      TabInfo.discarded, 
      isVideo, 
      isAudio, 
      is3D, 
      isMemoryLeak, 
      LLMresponse
    );
    
    return result;

  } catch (error) {
    console.warn(`Scout failed on tab ${tabId}:`, error);
    return 5; // Fallback score if the injection randomly fails
  }
}
export async function fetchAllTabs() {
  try {
    // 1. THE SAFETY CHECK: Does the chrome API exist right now?
    
    if (typeof chrome !== "undefined" && chrome.tabs) {
      // We are inside the real extension! Fetch real data.
      const allTabs = await chrome.tabs.query({});
      console.log("all tabs details:",allTabs);
      // We await the entire batch of tab calculations simultaneously
      let formattedTabs = await Promise.all(
        // Notice the 'async' added here before '(tab)'
        allTabs.map(async (tab: chrome.tabs.Tab) => {
  // 1. Run the heavy calculation EXACTLY ONCE
  const rawThreatScore = (await individualMemoryCalc(tab)) || 0;

  return {
    id: tab.id || 0, 
    title: tab.title || "New Tab",
    url: tab.url || "",
    favIconUrl: tab.favIconUrl || "",
    active: tab.active,
    discarded: tab.discarded,
    rawThreatScore: rawThreatScore, 
    ramUsage: rawThreatScore, 
  };
})
    
      );
      const TotalRamUsed:number = formattedTabs.reduce((sum:number, tab:number) => sum + tab.ramUsage, 0);

      // FIX 2: The Black Hole check. Only do the math if the total is greater than 0.
      if (TotalRamUsed > 0) {
        formattedTabs.forEach((element:any) => {
          // FIX 3: Math.round() forces the decimal into a clean, whole number (e.g. 47)
          element.ramUsage = Math.round((element.ramUsage / TotalRamUsed) * 100);
        });
      } else {
        // Fallback: If total is 0 (all tabs asleep), ensure they all read 0%
        formattedTabs.forEach((element:any) => {
          element.ramUsage = 0;
        });
      }

      console.log("Normalized tabs details:", formattedTabs);
      return formattedTabs

    } else {
      // 2. THE FALLBACK: We are on localhost. Return the Dummy Data.
      console.warn("Chrome API not found. Falling back to Mock Data for local development.");
      return [
        { id: 142, index: 3, windowId: 12, active: false, inactive: false, status: "complete", title: "React Documentation - Hooks", url: "https://react.dev/reference/react", favIconUrl: "https://react.dev/favicon.ico", groupId: -1, discarded: false, ramUsage: 35 },
        { id: 143, index: 3, windowId: 12, active: false, inactive: true, status: "complete", title: "Figma", url: "https://figma.dev/reference/project/120932", favIconUrl: "https://react.dev/favicon.ico", groupId: -1, discarded: false, ramUsage: 15 },
        { id: 144, index: 3, windowId: 12, active: false, inactive: false, status: "complete", title: "ChatGPT", url: "https://chatgpt.dev/reference/react", favIconUrl: "https://react.dev/favicon.ico", groupId: -1, discarded: false, ramUsage: 30 },
        { id: 145, index: 3, windowId: 12, active: false, inactive: true, status: "complete", title: "Gemini", url: "https://gemini.dev/reference/project/120932", favIconUrl: "https://react.dev/favicon.ico", groupId: -1, discarded: false, ramUsage: 20 },
      ];
    }

  } catch (error) {
    console.error("Failed to fetch tabs:", error);
    return [];
  }
}
export async function TotalMemory() {
  try {
    if (typeof chrome !== "undefined" && chrome.system && chrome.system.memory) {
      
      const rawMemory = await chrome.system.memory.getInfo();
      
      const bytesToMB = 1024 * 1024;
      
      const capacityMB = Math.round(rawMemory.capacity / bytesToMB);
      const availableMB = Math.round(rawMemory.availableCapacity / bytesToMB);

      console.log("Total RAM Details (MB):", capacityMB,"Total Available RAM Details (MB):",availableMB);
      
      return {
        "capacity": capacityMB,
        "availableCapacity": availableMB
      };

    } else {

      return { 
        "capacity": 7930, 
        "availableCapacity": 1044 
      };
    }
    
  } catch (error) {
    console.error("Failed to fetch memory:", error);
    return { capacity: 0, availableCapacity: 0 };
  }
}