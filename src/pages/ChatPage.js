import React, { useState } from 'react';
import ChatBox from '../components/ChatBox';
import InfoForm from '../components/InfoForm';
import '../_mock/index';
import backgroundImage from '../assets/H1.png';

function ChatPage() {
    const [showInfoForm, setShowInfoForm] = useState(false);

    const toggleInfoForm = () => {
        setShowInfoForm(prevState => !prevState);
    };

    return (
        <>
            <div
                className="absolute top-0 left-0 right-0 p-4 z-10 bg-yellow-500 h-16"
                style={{
                    backgroundImage: `url(${backgroundImage})`,
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '100% 100%', // 修改为 100% 使图片占据整行
                }}
            >
            </div>
            <div className="flex-grow overflow-hidden">
                <ChatBox onOpenInfoForm={toggleInfoForm} />
            </div>
            {showInfoForm && <InfoForm onClose={toggleInfoForm} />}
        </>
    );
}

export default ChatPage;
