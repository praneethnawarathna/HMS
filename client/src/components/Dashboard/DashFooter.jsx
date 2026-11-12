import React from 'react';

const DashFooter = () => {
    const currentYear = new Date().getFullYear();
    return (
        <footer className="flex flex-col md:flex-row justify-between items-center py-4 px-6 text-gray-500 text-sm select-none">
            <p>
                <span className="font-semibold" style={{ color: '#6b0f14' }}>© {currentYear}</span> All rights reserved. | Engineered by{' '}
                <span className="font-medium" style={{ color: '#d4af37' }}>
                    Information Technology Center, University of Peradeniya
                </span>
            </p>
           {/* <p className="mt-2 md:mt-0 font-mono tracking-wide" style={{ color: '#c59a3a' }}>version 1.0</p> */}
        </footer>
    );
};

export default DashFooter;
