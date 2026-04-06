import { motion, Variants } from "framer-motion"
import { useState } from "react"
const lineVariants: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: { 
    pathLength: 1, 
    opacity: 1,
    transition: { 
    //   delay: 2,           // Wait 2 seconds
      duration: 0.8,      // Time to draw the 'L'
      ease: "easeInOut" 
    }
  }
};
const boxVariants:Variants={
    hidden:{opacity:0,y:-10},
  visible:{
    opacity:1,
    y:0,
    transition:{
      duration:2.8,
      // ease:"easeInOut"
    }
  }
}
export const SpaceToolTip = ({title,url,classname,children}:any)=>{
const [pos,setPos] = useState({x:0,y:0})
const [show,setShow] = useState(false)
    const handleMouse =(e:React.MouseEvent)=>{
    setPos({x:e.clientX,y:e.clientY})
    console.log(pos);
    
    }
    return(
        <div 
        onMouseEnter={()=>setShow(true)}
        onMouseLeave={()=>setShow(false)}
        onMouseMove={handleMouse}
        className={classname}
        >
{children}
{show &&(

        // <div className="ANCHORBOX h-10 w-10 bg-blue z-100" style={{position:"fixed",left:pos.x,top:pos.y-150}}/>
        
        
<div
style={{position:"fixed",left:pos.x,top:pos.y-150}}
className="pointer-events-none z-50"

>
    <svg width="150" height="150" className="absolute overflow-visible">
<motion.path
    d="M 0 0 H 60 V 80"
    fill="transparent"
    stroke="#90CEFF"    // Your Neon Blue
    strokeWidth="2"
    variants={lineVariants}
    initial="hidden"
    animate="visible"
    />
          </svg>


<motion.div
    variants={boxVariants}
    style={{ left: 60, top: 80 }} // Matches the H 60 and V 80
    initial="hidden"
    animate="visible"
   className="absolute bg-glass/90 backdrop-blur-md border-l-2 border-neon-blue p-2 w-48 shadow-xl shadow-neon-blue/20"
    >

        
    <p className="text-neon-blue text-sm font-terminal">SECURE_LINK_ESTABLISHED</p>
            <p className="text-xs text-white truncate">{url}</p>
          
    </motion.div>
    </div> 
    )}
    </div>
    )
}