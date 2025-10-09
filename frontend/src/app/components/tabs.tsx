import React, { useState } from "react";

type TabProps = {
  children: React.ReactElement<{ title: string }>[];
};

const Tabs: React.FC<TabProps> = ({ children }) => {
  const [selectedTab, setSelectedTab] = useState(0);
  
  // Assume tab 3 (index 2) is always the side panel
  const mainTabs = children.filter((_, idx) => idx !== 2);
  const sidePanelTab = children[2];

  return (
    <div className="flex gap-4 h-full">
      {/* Left side - Main tabs */}
      <div className="flex-1">
        <div className="flex mb-4">
          {mainTabs.map((tab, idx) => (
            <button
              key={idx}
              className={`flex-1 py-2 px-4 font-bold rounded-t-lg border-b-2 transition-colors
                ${selectedTab === idx
                  ? "bg-northeasternRed text-white border-northeasternRed"
                  : "bg-northeasternWhite text-northeasternRed border-gray-300 hover:bg-springWater"
                }`}
              onClick={() => setSelectedTab(idx)}
            >
              {tab.props.title}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-center min-h-[60vh]">
          {mainTabs[selectedTab]}
        </div>
      </div>

      {/* Right side - Fixed Tab 3 */}
      <div className="w-1/2 border-l-2 border-gray-300 pl-4">
        <div className="mb-4">
          <div className="py-2 px-4 font-bold bg-northeasternRed text-white rounded-t-lg border-b-2 border-northeasternRed">
            {sidePanelTab?.props.title}
          </div>
        </div>
        <div className="flex items-center justify-center min-h-[60vh]">
          {sidePanelTab}
        </div>
      </div>
    </div>
  );
};

export default Tabs;