import React, { useEffect, useState, useRef } from 'react';
import ChatBox from '../components/ChatBox';
import AvatarArea from '../components/AvatarArea';
import { useNavigate } from 'react-router-dom';
import InfoForm from '../components/InfoForm';
import '../_mock/index';
import axios from 'axios';
import backgroundImage from '../assets/H1.png';


function ChatPage() {

    // useEffect(() => {
    //     // 在组件挂载时执行的逻辑
    //     axios.get('/api/getHealthAnalysis').then(response => {
    //         console.log(response.data);
    //     });
    // }, []);






    const [showInfoForm, setShowInfoForm] = useState(false);

    const toggleInfoForm = () => {
        setShowInfoForm(prevState => !prevState);
    };


    const navigate = useNavigate();

    const handleAvatarClick = () => {
        navigate('/personinfo');
    };

    return (
        <>
            <div
                className="absolute top-0 left-0 right-0 p-4 z-10 bg-yellow-500 h-16"
                style={{
                    backgroundImage: `url(${backgroundImage})`,
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '85% 100%',
                }}
            >
                {/* AvatarArea 将在各个页面中单独渲染 */}
            </div>
            <AvatarArea direction="right" onClick={handleAvatarClick} />
            <div className="flex-grow overflow-hidden">
                <ChatBox onOpenInfoForm={toggleInfoForm} />
            </div>
            {showInfoForm && <InfoForm onClose={toggleInfoForm} />}
        </>
    );
}

export default ChatPage;