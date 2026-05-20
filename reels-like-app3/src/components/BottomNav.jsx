import React from 'react';
import './BottomNav.css';

const BottomNav = () => {
    return (
        <div className="bottom-nav">
            <div className="nav-item active">
                <span>🏠</span>
            </div>
            <div className="nav-item">
                <span>🔍</span>
            </div>
            <div className="nav-item add-btn">
                <span>➕</span>
            </div>
            <div className="nav-item">
                <span>🎬</span>
            </div>
            <div className="nav-item">
                <span>👤</span>
            </div>
        </div>
    );
};

export default BottomNav;
