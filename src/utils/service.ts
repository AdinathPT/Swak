declare global {
  var LanguageModel: any;
}

interface TabInfoType {
  id: number;
  active: boolean;
  audible: boolean;
  autoDiscardable: boolean;
  discarded: boolean;
  frozen: boolean;
  highlighted: boolean;
  incognito: boolean;
  mutedInfo: { muted: boolean };
  pinned: boolean;
  selected: boolean;
  favIconUrl: string;
  groupId: number;
  height: number;
  index: number;
  lastAccessed: number;
  splitViewId: number;
  status: string;
  title: string;
  url: string;
  width: number;
  windowId: number;
}
interface TypesForamttedData {
  id: number;
  title: string;
  url: string;
  favIconUrl: string;
  active: string;
  discarded: boolean;
  rawThreatScore: number;
  ramUsage: number;
}

export const calculateDashboardStats = (tabs: TypesForamttedData[]) => {
  if (!tabs || tabs.length === 0) {
    return { sleeping: 0, duplicates: 0, highRam: 0, highThreat: 0 };
  }
  const sleepingCount = tabs.filter((tab) => tab.discarded).length;
  const highThreatCount = tabs.filter((tab) => tab.rawThreatScore >= 85).length;
  const highRamCount = tabs.filter((tab) => tab.ramUsage >= 70).length;
  const urlTracker: Record<string, number> = {};
  let duplicateCount = 0;

  tabs.forEach((tab) => {
    if (!tab.url || tab.url.startsWith("chrome://")) return;
    urlTracker[tab.url] = (urlTracker[tab.url] || 0) + 1;
  });

  Object.values(urlTracker).forEach((count: any) => {
    if (count > 1) {
      duplicateCount += count - 1;
    }
  });

  return {
    sleeping: sleepingCount,
    duplicates: duplicateCount,
    highRam: highRamCount,
    highThreat: highThreatCount,
  };
};

function chunkArray(array: any[], size: number) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

export async function new_LLMGroupNamer(allTabs: any[]) {
  if (typeof LanguageModel === "undefined") return [];

  console.log("%cWaking up AI model...", "color:blue");
  const session = await LanguageModel.create({ temperature: 0.1, topK: 1 });

  const tabChunks = chunkArray(allTabs, 10);
  let masterGroupList: any[] = [];

  try {
    for (const chunk of tabChunks) {
      const tabData = chunk.map((t: any) => `ID: ${t.id} | Title: ${t.title}`);

      const promptText = `
        Categorize these tabs into groups. 
        RESPOND ONLY IN JSON FORMAT: [{"groupName": "Name", "tabIds": [id1, id2]}]
        Tabs:
        ${tabData.join("\n")}
      `;

      console.log(`%cPrompting chunk of ${chunk.length} tabs...`, "color:blue");
      const resultText = await session.prompt(promptText);

      const cleanJson = resultText.replace(/```json|```/g, "").trim();
      const parsedGroups = JSON.parse(cleanJson);

      masterGroupList = [...masterGroupList, ...parsedGroups];
    }

    session.destroy();

    return masterGroupList;
  } catch (error) {
    console.warn("AI Prompt failed:", error);
    if (session) session.destroy();
    return [];
  }
}

export async function LLMGroupNamer(tabs: any) {
  if (typeof LanguageModel === "undefined") return [];

  const tabData = tabs.map((t: any) => `ID: ${t.id} | Title: ${t.title}`);
  const session = await LanguageModel.create({
    temperature: 0.1,
    topK: 1,
  });

  const promptText = `
You are a professional tab organizer. Review these tabs:
${tabData.join("\n")}

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

    const resultText = await session.prompt(promptText);
    session.destroy();

    const cleanJson = resultText.replace(/```json|```/g, "").trim();
    console.log("cleanJson:", JSON.parse(cleanJson));
    return JSON.parse(cleanJson);
  } catch (error) {
    console.warn("AI Prompt failed:", error);
    if (session) session.destroy();

    return [];
  }
}

export async function executeGroupTabs(aiGroups: any[], currentTabs: any) {
  const validTabIds = new Set(currentTabs.map((t: any) => t.id));

  for (const group of aiGroups) {
    const safeTabIds = group.tabIds.filter((id: number) => validTabIds.has(id));

    if (safeTabIds.length === 0) continue;

    try {
      const newGroupId = await chrome.tabs.group({
        tabIds: safeTabIds,
      });
      console.log("GROUP IDs:", newGroupId);
      await chrome.tabGroups.update(newGroupId, {
        title: group.groupName,
        collapsed: true,
      });
    } catch (error) {
      console.error(`Failed to create group ${group.groupName}:`, error);
    }
  }
}

export async function toggleSleep(isDiscarded: boolean, tabId: number) {
  if (isDiscarded) {
    console.log(`%cDiscarded ${tabId}`, "color:blue");
    await chrome.tabs.reload(tabId);
  } else {
    console.log(`%Reloaded ${tabId}`, "color:blue");
    await chrome.tabs.discard(tabId);
  }
}

export async function sendScoutToGetDom(tabId: number) {
  try {
    const injectionResults = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => document.querySelectorAll("*").length,
    });

    return injectionResults[0].result;
  } catch (error) {
    console.warn(
      `Scout failed to infiltrate tab ${tabId}. It might be a protected page.`,
    );
    return 0;
  }
}

async function memoryLeakLogger(
  tabId: number,
  currDomCount: number,
): Promise<boolean> {
  const data = await chrome.storage.session
    .get(tabId.toString())
    .then((result: any) => {
      return result;
    });
  let history = data[tabId.toString()] || [];
  history.push(currDomCount);
  if (history.length == 6) {
    history.shift();
  }
  await chrome.storage.session.set({ [tabId.toString()]: history });

  const isLeaked = history.forEach(
    (currValue: number, index: number, array: number[]) => {
      index == 0 || currValue >= array[index - 1];
    },
  );
  return Boolean(isLeaked);
}

async function LLMPredictUsage(
  tabTitle: string,
  tabUrl: string,
  additional_details: TabInfoType,
) {
  if (typeof LanguageModel === "undefined") {
    return { score: 50, classification: "Unknown" };
  }

  const availability = await LanguageModel.availability();
  if (availability === "no") {
    return { score: 50, classification: "Unknown (AI Not Supported)" };
  }

  if (availability === "downloadable" || availability === "downloading") {
    return { score: 50, classification: "Pending AI Download" };
  }

  const session = await LanguageModel.create();

  const schema = {
    type: "object",
    properties: {
      classification: {
        type: "string",
        enum: ["Lightweight", "Medium", "Heavy", "Extreme"],
      },
      estimatedScore: {
        type: "number",
      },
    },
    required: ["classification", "estimatedScore"],
  };

  const promptText = `
    You are a browser performance analyzer. 
    Analyze this tab: Title: "${tabTitle}", URL: "${tabUrl}".
    other than this additional information is also provided here:${additional_details}, this additional details should be given less weightage.
    Based on the domain and title and additional information, predict how heavy this web application is on system RAM and CPU.Can ONLY respond as ["Lightweight", "Medium", "Heavy", "Extreme"] 
  `;

  try {
    const resultText = await session.prompt(promptText, {
      responseConstraint: schema,
      omitResponseConstraintInput: true,
    });

    session.destroy();

    return JSON.parse(resultText);
  } catch (error) {
    console.warn("AI Prompt failed:", error);
    if (session) session.destroy();
    return { score: 50, classification: "Unknown" };
  }
}

async function memoryUsageFinalVerdict(
  Taburl: string,
  domNodeCount: number,
  jsHeapMB: number,
  networkRequests: number,
  TabInfoDiscarded: boolean,
  isVideo: boolean,
  isAudio: boolean,
  is3D: boolean,
  isMemoryLeak: boolean,
  LLMresponse: any,
): Promise<number> {
  let score = 5;
  const url = Taburl || "";
  if (TabInfoDiscarded) return 0;

  if (
    url.startsWith("chrome://") ||
    url.startsWith("chrome-extension://") ||
    url.startsWith("edge://") ||
    url.includes("chrome.google.com/webstore")
  ) {
    return 5;
  }

  score += Math.min((domNodeCount / 1000) * 2, 25);
  score += Math.min(jsHeapMB / 15, 20);
  score += Math.min(networkRequests / 25, 10);

  if (isVideo || isAudio) score += 20;
  if (is3D) score += 25;

  const llmScore = LLMresponse?.estimatedScore || score;

  score = score * 0.7 + llmScore * 0.3;

  if (isMemoryLeak) {
    score = Math.max(score, 95);
  }

  const finalResult = Math.round(Math.min(score, 100));

  return finalResult;
}

async function individualMemoryCalc(TabInfo: TabInfoType): Promise<number> {
  const tabId: number = TabInfo.id;
  const url = TabInfo.url || "";

  if (TabInfo.discarded) return 0;

  if (
    url.startsWith("chrome://") ||
    url.startsWith("chrome-extension://") ||
    url.startsWith("edge://") ||
    url.includes("chrome.google.com/webstore")
  ) {
    return 5;
  }

  try {
    const _injectionResults = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        return {
          domNodes: document.querySelectorAll("*").length,
          jsHeapBytes: performance?.memory?.usedJSHeapSize || 0,
          isVideo: Array.from(document.querySelectorAll("video")).some(
            (v) => !v.paused && !v.ended,
          ),
          is3D: Array.from(document.querySelectorAll("canvas")).some(
            (canvas) =>
              canvas.getContext("webgl") || canvas.getContext("webgl2"),
          ),
          networkRequests: performance.getEntriesByType("resource").length,
        };
      },
    });

    console.log("INJECTION results:", _injectionResults);

    const results = _injectionResults[0].result;
    const _rawBytes = results.jsHeapBytes;
    const domNodeCount = results.domNodes;
    const isVideo = results.isVideo;
    const is3D = results.is3D;
    const networkRequests = results.networkRequests;

    const jsHeapSizeMB = Number((_rawBytes / (1024 * 1024)).toFixed(2));
    const isAudio = TabInfo.audible;

    const LLMresponse = LLMPredictUsage(TabInfo.title, TabInfo.url, TabInfo);

    const isMemoryLeak = await memoryLeakLogger(tabId, domNodeCount);

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
      LLMresponse,
    );

    return result;
  } catch (error) {
    console.warn(`Scout failed on tab ${tabId}:`, error);
    return 5;
  }
}

export async function fetchAllTabs() {
  try {
    if (typeof chrome !== "undefined" && chrome.tabs) {
      const allTabs = await chrome.tabs.query({});
      console.log("all tabs details:", allTabs);

      let formattedTabs = await Promise.all(
        allTabs.map(async (tab: chrome.tabs.Tab) => {
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
        }),
      );

      const TotalRamUsed: number = formattedTabs.reduce(
        (sum: number, tab: number) => sum + tab.ramUsage,
        0,
      );

      if (TotalRamUsed > 0) {
        formattedTabs.forEach((element: any) => {
          element.ramUsage = Math.round(
            (element.ramUsage / TotalRamUsed) * 100,
          );
        });
      } else {
        formattedTabs.forEach((element: any) => {
          element.ramUsage = 0;
        });
      }

      console.log("Normalized tabs details:", formattedTabs);
      return formattedTabs;
    } else {
      console.warn(
        "Chrome API not found. Falling back to Mock Data for local development.",
      );
      return [
        {
          id: 142,
          index: 3,
          windowId: 12,
          active: false,
          inactive: false,
          status: "complete",
          title: "React Documentation - Hooks",
          url: "https://react.dev/reference/react",
          favIconUrl: "https://react.dev/favicon.ico",
          groupId: -1,
          discarded: false,
          ramUsage: 35,
        },
        {
          id: 143,
          index: 3,
          windowId: 12,
          active: false,
          inactive: true,
          status: "complete",
          title: "Figma",
          url: "https://figma.dev/reference/project/120932",
          favIconUrl: "https://react.dev/favicon.ico",
          groupId: -1,
          discarded: false,
          ramUsage: 15,
        },
        {
          id: 144,
          index: 3,
          windowId: 12,
          active: false,
          inactive: false,
          status: "complete",
          title: "ChatGPT",
          url: "https://chatgpt.dev/reference/react",
          favIconUrl: "https://react.dev/favicon.ico",
          groupId: -1,
          discarded: false,
          ramUsage: 30,
        },
        {
          id: 145,
          index: 3,
          windowId: 12,
          active: false,
          inactive: true,
          status: "complete",
          title: "Gemini",
          url: "https://gemini.dev/reference/project/120932",
          favIconUrl: "https://react.dev/favicon.ico",
          groupId: -1,
          discarded: false,
          ramUsage: 20,
        },
      ];
    }
  } catch (error) {
    console.error("Failed to fetch tabs:", error);
    return [];
  }
}

export async function TotalMemory() {
  try {
    if (
      typeof chrome !== "undefined" &&
      chrome.system &&
      chrome.system.memory
    ) {
      const rawMemory = await chrome.system.memory.getInfo();
      const bytesToMB = 1024 * 1024;

      const capacityMB = Math.round(rawMemory.capacity / bytesToMB);
      const availableMB = Math.round(rawMemory.availableCapacity / bytesToMB);

      console.log(
        "Total RAM Details (MB):",
        capacityMB,
        "Total Available RAM Details (MB):",
        availableMB,
      );

      return {
        capacity: capacityMB,
        availableCapacity: availableMB,
      };
    } else {
      return {
        capacity: 7930,
        availableCapacity: 1044,
      };
    }
  } catch (error) {
    console.error("Failed to fetch memory:", error);
    return { capacity: 0, availableCapacity: 0 };
  }
}
