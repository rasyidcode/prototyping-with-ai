import React from 'react';
import Reel from './Reel';

const ReelsList = () => {
    const reels = [
        {
            id: 1,
            title: 'Welcome to Reels',
            description: 'Check out this smooth scrolling experience',
            author: 'creator1',
            likes: '2.4K',
            comments: '156',
            shares: '432',
            bgColor: 'bg-gradient-to-br from-purple-600 to-pink-600'
        },
        {
            id: 2,
            title: 'Amazing Content',
            description: 'Scroll down to see more cool videos',
            author: 'creator2',
            likes: '5.2K',
            comments: '287',
            shares: '891',
            bgColor: 'bg-gradient-to-br from-blue-600 to-cyan-600'
        },
        {
            id: 3,
            title: 'Creative Ideas',
            description: 'Bring your imagination to life',
            author: 'creator3',
            likes: '3.8K',
            comments: '215',
            shares: '654',
            bgColor: 'bg-gradient-to-br from-green-600 to-emerald-600'
        },
        {
            id: 4,
            title: 'Trending Now',
            description: 'Join millions of creators',
            author: 'creator4',
            likes: '7.1K',
            comments: '342',
            shares: '1.2K',
            bgColor: 'bg-gradient-to-br from-orange-600 to-red-600'
        },
        {
            id: 5,
            title: 'Keep Scrolling',
            description: 'More awesome content ahead',
            author: 'creator5',
            likes: '4.3K',
            comments: '198',
            shares: '523',
            bgColor: 'bg-gradient-to-br from-indigo-600 to-purple-600'
        },
    ];

    return (
        <div className="w-full h-screen overflow-y-scroll snap-y snap-mandatory scroll-smooth bg-black">
            {/* Hide scrollbar while maintaining smooth scroll */}
            <style>{`
        /* Hide scrollbar for Chrome, Safari and Opera */
        div::-webkit-scrollbar {
          display: none;
        }
        /* Hide scrollbar for IE, Edge and Firefox */
        div {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

            {reels.map((reel) => (
                <Reel key={reel.id} {...reel} />
            ))}
        </div>
    );
};

export default ReelsList;
