import React from 'react';
import { ArrowLeftOutlined, ArrowRightOutlined } from '@ant-design/icons';

const AvatarArea = ({ direction, onClick }) => {
  const ArrowIcon = direction === 'left' ? ArrowLeftOutlined : ArrowRightOutlined;

  return (
    <div className="absolute top-4 right-4 z-10">
      <div
        className="w-10 h-10 flex items-center justify-center bg-blue-500 hover:bg-blue-600 transition-colors duration-300 rounded-full cursor-pointer"
        onClick={onClick}
      >
        <ArrowIcon style={{ fontSize: '24px', color: 'white' }} />
      </div>
    </div>
  );
};

export default AvatarArea;