import React from 'react';

const Reel = ({ id, title, description, author, likes, comments, shares, bgColor }) => {
    return (
        <div className="w-full h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-black relative overflow-hidden snap-start scroll-mt-0">
            {/* Background */}
            <div className={`absolute inset-0 ${bgColor}`}></div>

            {/* Content */}
            <div className="relative z-10 text-white px-4 text-center max-w-md">
                <div className="mb-8">
                    <div className="w-20 h-20 mx-auto mb-6 bg-gray-700 rounded-full flex items-center justify-center">
                        <span className="text-3xl font-bold">{id}</span>
                    </div>
                    <h2 className="text-4xl font-bold mb-4">{title}</h2>
                    <p className="text-xl text-gray-300 mb-2">@{author}</p>
                    <p className="text-lg text-gray-400">{description}</p>
                </div>
            </div>

            {/* Right Sidebar Actions */}
            <div className="absolute right-4 bottom-20 z-20 space-y-8">
                {/* Like Button */}
                <div className="flex flex-col items-center cursor-pointer hover:scale-110 transition-transform">
                    <div className="w-12 h-12 rounded-full bg-gray-700/50 hover:bg-gray-600/70 flex items-center justify-center">
                        <svg
                            className="w-6 h-6 text-white"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                        </svg>
                    </div>
                    <p className="text-white text-xs mt-2">{likes}</p>
                </div>

                {/* Comment Button */}
                <div className="flex flex-col items-center cursor-pointer hover:scale-110 transition-transform">
                    <div className="w-12 h-12 rounded-full bg-gray-700/50 hover:bg-gray-600/70 flex items-center justify-center">
                        <svg
                            className="w-6 h-6 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                            />
                        </svg>
                    </div>
                    <p className="text-white text-xs mt-2">{comments}</p>
                </div>

                {/* Share Button */}
                <div className="flex flex-col items-center cursor-pointer hover:scale-110 transition-transform">
                    <div className="w-12 h-12 rounded-full bg-gray-700/50 hover:bg-gray-600/70 flex items-center justify-center">
                        <svg
                            className="w-6 h-6 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                            />
                        </svg>
                    </div>
                    <p className="text-white text-xs mt-2">{shares}</p>
                </div>
            </div>

            {/* Bottom Info */}
            <div className="absolute bottom-8 left-4 z-20 max-w-xs">
                <div className="bg-black/30 backdrop-blur-sm p-3 rounded-lg">
                    <p className="text-sm text-gray-300">Swipe up for more</p>
                </div>
            </div>
        </div>
    );
};

export default Reel;
