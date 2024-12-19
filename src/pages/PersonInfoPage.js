import React, { useEffect, useState } from 'react';
import { Button, Modal, Select, Input, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import { request } from '../utils/index';
import { userid_generate } from '../utils/uuid';
import backgroundImage from '../assets/H1.png';
import { RightOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';

const { Option } = Select;

function PersonInfoPage() {
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState({
    age: '',
    gender: '',
    height: '',
    weight: '',
    smoking: '',
    drinking: '',
    exercise: '',
    bmi: '',
    waistline: '',
    hipline: '',
    whr: '',
    systolic: '',
    diastolic: '',
    heartrate: '',
    medicalhistory: [],
  });
  const [healthAnalysis, setHealthAnalysis] = useState('尚未生成健康分析报告');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [medicalHistoryOptions, setMedicalHistoryOptions] = useState([]);
  const [graph, setGraph] = useState(null);

  useEffect(() => {
    // 加载 CSV 文件
    Papa.parse('/nodes2.csv', {
      download: true,
      encoding: 'utf-8', // 指定编码
      complete: function(results) {
        if (results.data && results.data.length > 0) {
          const options = results.data
            .map(row => row[0])
            .filter(item => item && item.trim() !== '');
          setMedicalHistoryOptions(options);
          console.log('加载的疾病选项：', options);
        } else {
          console.error('CSV文件为空或格式不正确');
          message.error('加载疾病列表失败，请刷新页面重试');
        }
      },
      error: function(error) {
        console.error('解析CSV文件时出错:', error);
        message.error('加载疾病列表失败，请刷新页面重试');
      }
    });

    const getInitialValue = (key, defaultValue) => {
      const storedValue = localStorage.getItem(key);
      return storedValue && storedValue !== '' ? storedValue : defaultValue;
    };

    setUserInfo({
      age: getInitialValue('age', '选择'),
      gender: getInitialValue('gender', '选择'),
      height: getInitialValue('height', ''),
      weight: getInitialValue('weight', ''),
      smoking: getInitialValue('smoking', '选择'),
      drinking: getInitialValue('drinking', '选择'),
      exercise: getInitialValue('exercise', '选择'),
      bmi: getInitialValue('bmi', '自动计算'),
      waistline: getInitialValue('waistline', ''),
      hipline: getInitialValue('hipline', ''),
      whr: getInitialValue('whr', '自动计算'),
      systolic: getInitialValue('systolic', ''),
      diastolic: getInitialValue('diastolic', ''),
      heartrate: getInitialValue('heartrate', ''),
      gangmen: getInitialValue('gangmen', ''),
      medicalhistory: Array.isArray(JSON.parse(getInitialValue('medicalhistory', '[]'))) 
        ? JSON.parse(getInitialValue('medicalhistory', '[]'))
        : [],
    });

    const healthAnalysis_in_storage = getInitialValue('healthAnalysis', '尚未生成您的健康风险分析报告，请完善个人信息后点击提交，以进行云端分析');

    const pendingMessages = [
      "正在分析中，约十分钟之后可刷新查看结果",
      "结果尚在处理中，请稍后刷新",
      "分析过程出现错误，请重新提交分析",
      "查询分析结果时出错，请稍后重试"
    ];

    if (!pendingMessages.includes(healthAnalysis_in_storage)) {
      setHealthAnalysis(healthAnalysis_in_storage);
    }

    if (healthAnalysis_in_storage === "正在分析中，约十分钟之后可刷新查看结果" ||
        healthAnalysis_in_storage === "结果尚在处理中，请稍后刷新") {
      setIsAnalyzing(true);
    }

    if (healthAnalysis_in_storage === "正在分析中，约十分钟之后可刷新查看结果") {
      queryHealthAnalysis();
    }

    // 修改获取网络数据的函数
    const fetchNetworkData = async () => {
      try {
        let userid = localStorage.getItem('userid');
        if (!userid) {
          userid = userid_generate();
          localStorage.setItem('userid', userid);
        }

        console.log('正在请求网络数据，userid:', userid);

        // 使用request工具而不是fetch
        const response = await request.get(`/get-network-data/${userid}`, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });

        console.log('收到响应:', response);

        // request工具会自动处理JSON,所以直接使用response.data
        const data = response.data;
        
        // 验证数据结构
        if (!data || typeof data !== 'object') {
          throw new Error('返回的数据格式不正确');
        }

        // 处理健康分析文本
        if (data.health_analysis) {
          setHealthAnalysis(data.health_analysis);
          localStorage.setItem('healthAnalysis', data.health_analysis);
        }

        // 处理网络图数据
        if (data.network_json?.nodes && data.network_json?.links) {
          const networkData = data.network_json;
          // 处理节点大小
          const nodes = networkData.nodes.map(node => {
            if (node.value === "") {
              return { ...node, symbolSize: 30 };
            }
            const minSize = 15;
            const maxSize = 50;
            const minSymbolSize = Math.min(...networkData.nodes.map(n => n.value));
            const maxSymbolSize = Math.max(...networkData.nodes.map(n => n.value));
            const scaledSize = minSize + (maxSize - minSize) * 
              ((node.value - minSymbolSize) / (maxSymbolSize - minSymbolSize));
            return { ...node, symbolSize: scaledSize };
          });
          // 处理连接线宽度
          const minWidth = 0.2;
          const maxWidth = 10;
          const linkValues = networkData.links.map(link => link.value);
          const minValue = Math.min(...linkValues);
          const maxValue = Math.max(...linkValues);
          const links = networkData.links.map(link => {
            const scaledValue = minWidth + (maxWidth - minWidth) * 
              ((link.value - minValue) / (maxValue - minValue));
            // 处理source和target,去掉.0后缀
            const source = link.source.replace('.0', '');
            const target = link.target.replace('.0', '');
            return {
              ...link,
              source,
              target,
              lineStyle: { width: scaledValue }
            };
          });

          setGraph({ ...networkData, nodes, links });
        } else {
          console.warn('网络数据结构不完整:', data);
        }
      } catch (error) {
        // console.error('加载网络数据时出错:', error);
        // message.error('加载网络数据失败：' + error.message);
        setGraph(null);
        if (!localStorage.getItem('healthAnalysis')) {
          setHealthAnalysis('尚未生成您的健康风险分析报告，请完善个人信息后点击提交，以进行云端分析');
        }
      }
    };

    fetchNetworkData();
  }, []);

  const queryHealthAnalysis = () => {
    request.get('/queryHealthAnalysis', {
      headers: {
        'Content-Type': 'application/json'
      }
    })
      .then(response => {
        if (response.data && response.data.data && response.data.data.healthanalysis) {
          const analysisResult = response.data.data.healthanalysis;
          if (analysisResult !== "pending" && analysisResult !== "error") {
            setHealthAnalysis(analysisResult);
            localStorage.setItem('healthAnalysis', analysisResult);
            setIsAnalyzing(false);
          } else if (analysisResult === "pending") {
            setHealthAnalysis("结果尚在处理中，请稍后刷新");
            setIsAnalyzing(true);
          } else if (analysisResult === "error") {
            setHealthAnalysis("分析过程出现错误，请重新提交分析");
            setIsAnalyzing(false);
          }
        }
      })
      .catch(error => {
        console.error('查询健康分析结果时出错:', error);
        setHealthAnalysis("查询分析结果时出错，请稍后重试");
        setIsAnalyzing(false);
      });
  };

  const handleAvatarClick = () => {
    navigate('/');
  };




  // 添加 BMI 计算函数
  const calculateBMI = (weight, height) => {
    if (!weight || !height) return '';
    const weightNum = parseFloat(weight);
    const heightNum = parseFloat(height) / 100; // 转换为米
    if (isNaN(weightNum) || isNaN(heightNum) || heightNum === 0) return '';
    return (weightNum / (heightNum * heightNum)).toFixed(2);
  };

  // 添加腰臀比计算函数
  const calculateWHR = (waist, hip) => {
    if (!waist || !hip) return '';
    const waistNum = parseFloat(waist);
    const hipNum = parseFloat(hip);
    if (isNaN(waistNum) || isNaN(hipNum) || hipNum === 0) return '';
    return (waistNum / hipNum).toFixed(2);
  };

  // 处理输入值变化
  const handleInputChange = (field, value) => {
    const newUserInfo = { ...userInfo, [field]: value };
    
    // 自动计算 BMI
    if (field === 'weight' || field === 'height') {
      newUserInfo.bmi = calculateBMI(newUserInfo.weight, newUserInfo.height);
    }
    
    // 自动计算腰臀比
    if (field === 'waistline' || field === 'hipline') {
      newUserInfo.whr = calculateWHR(newUserInfo.waistline, newUserInfo.hipline);
    }
    
    setUserInfo(newUserInfo);
  };

  // 渲染单个输入字段
// 渲染单个输入字段
const renderInputField = (label, field, type, required = false, placeholder = '', disabled = false) => (
  <div className="w-1/2 px-2 mb-4">
    <div className="flex items-center">
      <span className="mr-2 w-28 text-sm whitespace-nowrap">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}:
      </span>
      {type === 'select' ? (
        <Select
          disabled={disabled}
          style={{ width: '80%' }}
          value={userInfo[field]}
          onChange={(value) => handleInputChange(field, value)}
          placeholder={placeholder}
        >
          {field === 'age' && [...Array(100)].map((_, i) => (
            <Option key={i + 1} value={`${i + 1}`}>{i + 1}岁</Option>
          ))}
          {field === 'gender' && [
            <Option key="男" value="男">男</Option>,
            <Option key="女" value="女">女</Option>
          ]}
          {(field === 'smoking' || field === 'drinking' || field === 'exercise') && [
            <Option key="有" value="有">有</Option>,
            <Option key="没有" value="没有">没有</Option>
          ]}
        </Select>
      ) : (
        <Input
          disabled={disabled}
          value={userInfo[field]}
          onChange={(e) => handleInputChange(field, e.target.value)}
          placeholder={placeholder}
          className="flex-grow"
        />
      )}
    </div>
  </div>
);

  // 添加验证函
  const validateRequiredFields = () => {
    const requiredFields = [
      { field: 'age', label: '年龄' },
      { field: 'gender', label: '性别' },
      { field: 'height', label: '身高' },
      { field: 'weight', label: '体重' },
      { field: 'smoking', label: '吸烟史' },
      { field: 'drinking', label: '饮酒史' },
      { field: 'exercise', label: '运动情况' }
    ];

    const emptyFields = requiredFields.filter(({ field, label }) => {
      const value = userInfo[field];
      return !value || value === '' || value === '选择';
    });

    if (emptyFields.length > 0) {
      Modal.error({
        title: '信息不完整',
        content: (
          <div>
            <p>请补充以下必填信息：</p>
            <ul className="list-disc pl-5 mt-2">
              {emptyFields.map(({ label }) => (
                <li key={label}>{label}</li>
              ))}
            </ul>
          </div>
        ),
      });
      return false;
    }
    return true;
  };

  const validateNumberFields = () => {
    // 验证身高
    const height = parseFloat(userInfo.height);
    if (isNaN(height) || height < 50 || height > 220) {
      Modal.error({
        title: '数据格式错误',
        content: '身高必须是50-220之间的数字',
      });
      return false;
    }

    // 验证体重
    const weight = parseFloat(userInfo.weight);
    if (isNaN(weight) || weight < 10 || weight > 200) {
      Modal.error({
        title: '数据格式错误',
        content: '体重必须是10-200之间的数字',
      });
      return false;
    }

    // 验证可选的数字字段
    const optionalNumberFields = [
      { field: 'waistline', label: '腰围' },
      { field: 'hipline', label: '臀围' },
      { field: 'systolic', label: '收缩压' },
      { field: 'diastolic', label: '舒张压' },
      { field: 'heartrate', label: '心率' }
    ];

    for (const { field, label } of optionalNumberFields) {
      const value = userInfo[field];
      if (value && value.trim() !== '') {
        if (!/^\d+$/.test(value.trim())) {
          Modal.error({
            title: '数据格式错误',
            content: `${label}必须是纯数字`,
          });
          return false;
        }
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateRequiredFields()) return;
    if (!validateNumberFields()) return;

    // 保存所有信息到localStorage
    Object.entries(userInfo).forEach(([key, value]) => {
      if (key === 'medicalhistory') {
        localStorage.setItem(key, JSON.stringify(value));
      } else {
        localStorage.setItem(key, value);
      }
    });

    try {
      // 检查localstorage中是否有userid���没有的话就创建一个
      let userid = localStorage.getItem('userid');
      if (!userid) {
        // 如果不存在或为空,生成新的 userid
        userid = userid_generate();
      }
      // 发送数据到后端
      console.log('即将发送请求', userInfo);
      await request.post('/report', userInfo, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // 显示成功倒计时模态框
      let secondsLeft = 2;
      const modal = Modal.success({
        title: '保存成功',
        content: `保存成功，${secondsLeft}s后开始问诊~`,
        keyboard: false,
        maskClosable: false,
        okButtonProps: { style: { display: 'none' } },
      });

      const timer = setInterval(() => {
        secondsLeft -= 1;
        modal.update({
          content: `保存成功，${secondsLeft}s后开始问诊~`,
        });

        if (secondsLeft === 0) {
          clearInterval(timer);
          modal.destroy();
          navigate('/');
        }
      }, 1000);

    } catch (error) {
      console.error('保存用户信息失败:', error);
      Modal.error({
        title: '保存失败',
        content: '保存用户信息时出现错误，请稍后重试',
      });
    }
  };

  // 添加网络图配置
  const getNetworkOption = () => {
    if (!graph) return {};
    
    return {
      backgroundColor: '#1a1a1a',
      tooltip: {},
      legend: [{
        data: graph.categories?.map(a => a.name) || [],
        textStyle: { color: '#fff' }
      }],
      animationDuration: 1500,
      animationEasingUpdate: 'quinticInOut',
      series: [{
        name: '',
        type: 'graph',
        legendHoverLink: false,
        layout: 'force',
        force: {
          repulsion: 1000,
          edgeLength: [100, 200],
          gravity: 0.1,
          friction: 0.6,
        },
        data: graph.nodes,
        links: graph.links,
        categories: graph.categories,
        roam: true,
        label: {
          show: true,
          position: 'inside',
          formatter: params => {
            if (params.data.symbolSize > 0) {
              return [
                `${params.name}`,  // 节点名称
                `概率: ${params.data.value}`  // 节点值
              ].join('\n');
            }
            return '';
          },
          fontSize: 12,
          color: '#fff'
        },
        lineStyle: {
          opacity: 0.5,
          color: 'source',
          curveness: 0.3
        },
        emphasis: {
          focus: 'adjacency',
          lineStyle: { width: 5 }
        }
      }]
    };
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <div
        className="absolute top-0 left-0 right-0 p-4 z-10 bg-yellow-500 h-16"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          backgroundRepeat: 'no-repeat',
          backgroundSize: '100% 100%', // 修改这里使背景图片占据整行
        }}
      />
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-blue-500 rounded-lg shadow-md p-6 mb-6 mt-20">
          <h2 className="text-2xl font-bold mb-4 text-white">基本信息</h2>
          <div className="flex flex-wrap -mx-2">
            {renderInputField('年龄', 'age', 'select', true)}
            {renderInputField('性别', 'gender', 'select', true)}
            {renderInputField('身高', 'height', 'input', true, 'cm')}
            {renderInputField('体重', 'weight', 'input', true, 'kg')}
            {renderInputField('吸烟史', 'smoking', 'select', true)}
            {renderInputField('饮酒史', 'drinking', 'select', true)}
            {renderInputField('运动否', 'exercise', 'select', true)}
            {renderInputField('BMI指数', 'bmi', 'input', false, '', true)}
            {renderInputField('腰围', 'waistline', 'input', false, 'cm')}
            {renderInputField('臀围', 'hipline', 'input', false, 'cm')}
            {renderInputField('腰臀比', 'whr', 'input', false, '', true)}
            {renderInputField('收缩压', 'systolic', 'input', false, '数字如120')}
            {renderInputField('舒张压', 'diastolic', 'input', false, '数字如75')}
            {renderInputField('心率', 'heartrate', 'input', false, '数字如100')}
          </div>

          <h2 className="text-2xl font-bold my-4 text-white">过往病史</h2>
          <div className="flex justify-center">
            <div className="w-3/4">
              <Select
                mode="multiple"
                style={{ width: '100%' }}
                onChange={(value) => handleInputChange('medicalhistory', value)}
                value={userInfo.medicalhistory}
                showSearch
                optionFilterProp="children"
                filterOption={(input, option) =>
                  option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
                placeholder="请选择或搜索过往病史"
              >
                {medicalHistoryOptions.map(disease => (
                  <Option key={disease} value={disease}>{disease}</Option>
                ))}
              </Select>
            </div>
          </div>

          <div className="flex justify-center mt-6">
            <Button 
              type="primary" 
              icon={<RightOutlined />}
              size="large"
              onClick={handleSubmit}
              className="flex items-center px-8 py-4 bg-gradient-to-r from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white rounded-full shadow-lg transform hover:scale-105 transition-all duration-300"
            >
              保存信息，开始问诊吧！
            </Button>
          </div>
        </div>
        <div className="bg-yellow-100 rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-4 text-yellow-800">健康风险分析</h2>
          
          {/* 网络图容器 */}
          <div className="bg-white rounded-lg  shadow-inner mb-4" style={{ height: '500px' }}>
            {graph ? (
              <ReactECharts
                option={getNetworkOption()}
                style={{ height: '100%', width: '100%' }}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <span>尚未生成网络图</span>
              </div>
            )}
          </div>

          {/* 健康分析文本 */}
          <div className="bg-white rounded-lg p-3 shadow-inner mt-4">
            <p className="text-gray-800 leading-relaxed whitespace-pre-wrap break-words">
              {healthAnalysis}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PersonInfoPage;
