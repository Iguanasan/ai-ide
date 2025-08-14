import React, { useState } from 'react';
     import { ResizableBox } from 'react-resizable';
     import { ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

     const SidePanel: React.FC = () => {
       const [isCollapsed, setIsCollapsed] = useState(false);
       const [width, setWidth] = useState(300);

       const handleResize = (_: any, { size }: { size: { width: number; height: number } }) => {
         setWidth(size.width);
       };

       return (
         <ResizableBox
           className={`bg-gray-200 p-4 h-full ${isCollapsed ? 'w-0 p-0 overflow-hidden' : ''}`}
           width={isCollapsed ? 0 : width}
           height={Infinity}
           handle={
             <div className="absolute right-0 top-0 bottom-0 w-2 bg-gray-400 cursor-col-resize" />
           }
           onResize={handleResize}
           resizeHandles={['e']}
           minConstraints={[200, Infinity]}
           maxConstraints={[400, Infinity]}
         >
           <div className="h-full">
             <div className="mb-4">
               <button
                 type="button"
                 onClick={() => setIsCollapsed(!isCollapsed)}
                 className="p-1 rounded hover:bg-gray-200"
                 title={isCollapsed ? 'Expand panel' : 'Collapse panel'}
               >
                 {isCollapsed ? (
                   <ArrowRightIcon className="h-5 w-5 text-gray-600" />
                 ) : (
                   <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
                 )}
               </button>
             </div>
             {!isCollapsed && <p>Tool List Placeholder (Resizable)</p>}
           </div>
         </ResizableBox>
       );
     };

     export default SidePanel;