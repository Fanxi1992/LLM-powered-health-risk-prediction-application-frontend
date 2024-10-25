import Mock from 'mockjs';

Mock.mock('/api/getHealthAnalysis', 'get', () => {
  return {
    success: true,
    data: {
      healthAnalysis: `健康分析结果（分析于${Date.now()})` ,
    },
  };
});