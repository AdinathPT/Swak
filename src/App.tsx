import { AnimatePresence, motion, Variants } from "framer-motion"
import { useEffect, useState } from "react";
import { SpaceToolTip } from "./components/SpaceTooltip";
import { Loader, PauseCircle, Play, PlayCircle, Search } from "lucide-react";
import { OverallStats } from "./components/OverallSection";
import { fetchAllTabs, TotalMemory, toggleSleep,LLMGroupNamer,executeGroupTabs } from "./utils/service";

interface TypesRamData {
  capacity: number;
  availableCapacity: number;
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

const TabSkeletonLoader = () => {
  return (
    <div className="mb-2 clipped-card backdrop-blur-xl bg-slate-800/30 p-px rounded-xl animate-pulse">
      <div className="flex flex-col p-0.5 h-12 w-full justify-center clipped-card bg-glass/90 rounded-xl relative">
        <div className="h-4 bg-slate-600/50 rounded-md w-3/4 ml-2 mb-1"></div>
        <div className="h-3 bg-slate-700/50 rounded-md w-1/2 ml-2"></div>
        <div className="absolute right-11 h-4 bg-slate-600/50 rounded-md w-6"></div>
        <div className="absolute right-2 h-5 w-5 bg-slate-600/50 rounded-full"></div>
      </div>
    </div>
  );
};

const MainTabs = ({ ascSort,Tabs_Details = [] }: any) => {
  const [sortedTabs, setSortedTabs] = useState(
    [...Tabs_Details].sort((a, b) => !ascSort ? (b.ramUsage - a.ramUsage):(a.ramUsage - b.ramUsage))
  )

  useEffect(() => {
    setSortedTabs(
      [...Tabs_Details].sort((a, b) =>  !ascSort ? (b.ramUsage - a.ramUsage):(a.ramUsage - b.ramUsage))
    );
  }, [Tabs_Details]);

  function getRamColor(rawThreatScore: number) {
    if (rawThreatScore >= 85) return "red";
    if (rawThreatScore >= 60) return "yellow";
    return "green";
  }

  const handletoggleSleep = async (currentlyDiscarded: boolean, tabId: number) => {
    setSortedTabs(prevTabs => {
      const updatedTabs = prevTabs.map(tab =>
        tab.id === tabId ? { ...tab, discarded: !currentlyDiscarded } : tab
      );
      return updatedTabs.sort((a, b) =>  !ascSort ? (b.ramUsage - a.ramUsage):(a.ramUsage - b.ramUsage));
    });

    try {
      await toggleSleep(currentlyDiscarded, tabId)
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="TABCONTAINER max-h-[325px] mt-2 overflow-y-auto p-2 row-span-4 bg-glass/80 backdrop-blur-lg border border-white/10 rounded-2xl">
      {sortedTabs.map((items: any, index: number) => {
        const threatColor = getRamColor(items.rawThreatScore)
        return (
          <motion.div layout key={items.id}
            className={`CLIPPEDGLOWCARD mb-2 clipped-card backdrop-blur-xl ${threatColor == "red" ? "bg-RAM-red/30" : (threatColor == "yellow" ? "bg-RAM-yellow/30" : "bg-RAM-green/30")} p-px rounded-xl transition-colors duration-500`}>
            <div className="GLOWCARD flex flex-col p-0.5 h-12 w-full justify-center clipped-card bg-glass/90 rounded-xl">
              <div style={{ width: `${Number(items.ramUsage.toFixed(0))}%` }} className={`GLOWCARD absolute left-0 p-0.5 h-12 justify-center clipped-card-rev bg-black/50 rounded-xl -z-10`} />
              <h3 className="TITLE text-slate-300 px-2 text-sm truncate max-w-40 font-semibold">{items.title}</h3>
              <p className="TITLE text-slate-500  px-2 text-xs truncate max-w-40 font-semibold">{items.url}</p>
              <div className="absolute h-full w-2 right-11 flex items-center justify-center">
                <p className="text-slate-700 text-xs font-extrabold">{items.ramUsage.toFixed(0)}%</p>
              </div>
              <div className="absolute h-5 w-5 right-2 flex items-center justify-center">
                {items.discarded ? (<PlayCircle className="cursor-pointer text-slate-400" onClick={() => handletoggleSleep(true, items.id)} />) : (<PauseCircle className=" cursor-pointer text-red-400" onClick={() => handletoggleSleep(false, items.id)}  />)}
              </div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

export default function App() {
  const [tabs, setTabs] = useState<TypesForamttedData[] | null>(null)
  const [totalRamDetails, setTotalRamDetails] = useState<TypesRamData | null>(null)
  const [progressDown, setProgressDown] = useState<number>(0)
  const [statusDown, setStatusDown] = useState<string>("checking...");
  const [stopLoopRetrieval,setStopLoopRetrieval] = useState<boolean>(false)
  const [organiseLoading,setOrganiseLoading] = useState<boolean>(false)
  const [searchQuery,setSearchQuery] = useState<string>("")
  const [ascSort,setAscSort] = useState<boolean>(false)
  useEffect(() => {
    const checkStatus = async () => {
      if (typeof LanguageModel === "undefined") {
        setStatusDown("unsupported");
        return;
      }
      const availability = await LanguageModel.availability();
      setStatusDown(availability);
    }
    checkStatus()
  }, [])

  useEffect(() => {
    const loadData = async () => {
      const ramDetails: any = await TotalMemory();
      setTotalRamDetails(ramDetails);
    };
    loadData();
  }, []);

  useEffect(() => {
  let isMounted = true;
  let intervalId:any; 

  const loadData = async () => {
    try {
      const realTabs = await fetchAllTabs();
      if (isMounted) {
        setTabs(realTabs || []);
      }
    } catch (error) {
      if (isMounted) setTabs([]);
    }
  };

  loadData();

  // 2. The loop will only start if stopLoopRetrieval is false
  if (!stopLoopRetrieval) {
    intervalId = setInterval(() => {
      loadData();
    }, 3000);
  }

  // 3. This cleanup runs the exact millisecond stopLoopRetrieval changes!
  return () => {
    isMounted = false;
    if (intervalId) clearInterval(intervalId);
  };

}, [stopLoopRetrieval]);
const handleOrganiseTabs = async ()=>{
console.log(`%cgrouping...`,"color:blue")
setStopLoopRetrieval(true)
setOrganiseLoading(true)
const res =await LLMGroupNamer(tabs)
await executeGroupTabs(res,tabs)
setOrganiseLoading(false)
setStopLoopRetrieval(false)
}
  const handleDownloadAiModel = async () => {
    try {
      const session = await LanguageModel.create({
        monitor(m: any) {
          m.addEventListener('downloadprogress', (e: any) => {
            const percentage = Math.round((e.loaded / e.total) * 100);
            setProgressDown(percentage);
            setStatusDown("downloading");
          });
        }
      })
      session.destroy();
      setStatusDown("readily");
    } catch (error) {
      setStatusDown("error");
    }
  }
const filteredTabs= tabs ? tabs.filter((tab)=>{
  const query = searchQuery.toLowerCase()
  const safeTitle = tab.title?.toLowerCase() || "";
  const safeUrl = tab.url?.toLowerCase() || "";
  return safeTitle.includes(query) || safeUrl.includes(query);
}) : null
  return (
    // <div className="SCREEN flex items-center justify-center max-h-[600px] w-screen bg-gray-400 my-2">
      <div className="CONTAINER max-h-[600px] max-w-[350px] grid grid-row-3 px-4 gap-4 bg-linear-to-br from-canvas to-canvasGlow border-2 border-gray-600/20 h-screen min-w-72">
        <div className="GLOWCARD max-h-40 bg-glass/10 backdrop-blur-lg border border-white/5 rounded-2xl">
          <OverallStats totalRamDetails={totalRamDetails} tabs={tabs}/>
        </div>
        <div className="max-h-5 my-2">
          <div className="SEARCHBAR mb-1 flex flex-row items-center bg-glass/80 max-h-10 backdrop-blur-lg border border-white/10 rounded-lg">
            <Search className="text-slate-700 my-1 mx-0.5 mr-2" size={20} />
            <input
              placeholder="Search the tabs..."
              className="placeholder:text-slate-700 focus:outline-none text-slate-400"
              value={searchQuery}
              onChange={(e)=>setSearchQuery(e.target.value)}
            />
          </div>
          <div className="BELOWSEARCHSECTION flex flex-row justify-between">
            {statusDown === "unsupported" || statusDown === "no" ? (
              <button className="text-blue-500/40 cursor-not-allowed">
                AI Not Supported
              </button>
            ) : statusDown === "downloadable" ? (
              <button onClick={handleDownloadAiModel} className="text-blue-500 cursor-pointer hover:text-blue-400">
                Setup AI (~1.5GB)
              </button>
            ) : statusDown === "downloading" ? (
              <p className="text-blue-500/80 cursor-wait">
                Setting up... {progressDown}%
              </p>
            ) : statusDown === "readily" || statusDown === "available" ? (
              <button onClick={handleOrganiseTabs} disabled={organiseLoading} className={`text-blue-500 ${!organiseLoading ? "hover:text-blue-400 cursor-pointer": "text-slate-500"}`}>
                {organiseLoading?"Loading...(~2 min)":"Organise Tabs with AI"}
              </button>
            ) : (
              <button disabled className="text-blue-500/40">
                Checking AI Status...
              </button>
            )}
           <button 
  onClick={() => setAscSort(!ascSort)} 
  className="text-blue-500 hover:text-blue-400 cursor-pointer"
>
  {ascSort ? '⏶' : '⏷'} Sort
</button>

          </div>
        </div>
        {tabs && tabs.length > 0 ? (
          <MainTabs ascSort={ascSort} Tabs_Details={searchQuery!="" ? filteredTabs: tabs} />
        ) : tabs !== null && tabs.length === 0 ? (
          <div className="TABCONTAINER p-2 row-span-4 bg-glass/80 backdrop-blur-lg border border-white/10 rounded-2xl flex items-center justify-center">
            <p className="text-slate-400">No tabs found.</p>
          </div>
        ) : (
          <div className="TABCONTAINER p-2 row-span-4 bg-glass/80 backdrop-blur-lg border border-white/10 rounded-2xl">
            {[1, 2, 3, 4].map((key) => <TabSkeletonLoader key={key} />)}
          </div>
        )}
      </div>
    // </div>
  )
}