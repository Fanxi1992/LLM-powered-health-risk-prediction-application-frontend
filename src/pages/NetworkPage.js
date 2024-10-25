import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'antd';
import { HomeOutlined } from '@ant-design/icons';

const Page = () => {
    const navigate = useNavigate();

    const handleGoHome = () => {
        navigate('/');
    };

    const [graph, setGraph] = React.useState(null);

    React.useEffect(() => {
        fetch('/corrected_json_file2.json')
            .then(response => response.json())
            .then(data => {
                // 对 symbolSize 进行缩放处理
                const nodes = data.nodes.map(node => {
                    const minSize = 1.5;
                    const maxSize = 50;
                    const nodeSize = node.symbolSize;  // 使用节点的 symbolSize 字段

                    // 找到最小和最大的 symbolSize
                    const minSymbolSize = Math.min(...data.nodes.map(n => n.symbolSize));
                    const maxSymbolSize = Math.max(...data.nodes.map(n => n.symbolSize));

                    // 线性缩放到 1.5 到 50 的范围
                    const scaledSize = minSize + (maxSize - minSize) * ((nodeSize - minSymbolSize) / (maxSymbolSize - minSymbolSize));

                    return {
                        ...node,
                        symbolSize: scaledSize
                    };
                });

                // 对 links 中的 value 进行缩放处理
                const minWidth = 0.2;
                const maxWidth = 10;

                const linkValues = data.links.map(link => link.value);
                const minValue = Math.min(...linkValues);
                const maxValue = Math.max(...linkValues);

                const links = data.links.map(link => {
                    const scaledValue = minWidth + (maxWidth - minWidth) * ((link.value - minValue) / (maxValue - minValue));
                    return {
                        ...link,
                        lineStyle: {
                            width: scaledValue
                        }
                    };
                });

                setGraph({
                    ...data,
                    nodes,
                    links
                });
            })
            .catch(error => console.error('加载网络数据时出错:', error));
    }, []);

    if (!graph) {
        return <div>加载中...</div>;
    }

    let option = {
        backgroundColor: '#1a1a1a',  // 深色背景
        tooltip: {},
        legend: [
            {
                data: graph.categories.map(function (a) {
                    return a.name;
                }),
                textStyle: {
                  color: '#fff'  // 图例文字颜色
              },
            }
        ],
        animationDuration: 1500,
        animationEasingUpdate: 'quinticInOut',
        series: [
            {
                name: '',
                type: 'graph',
                legendHoverLink: false,
                layout: 'force',
                force: {
                    repulsion: 1000,
                    edgeLength: [100, 200],
                    gravity: 0.1,
                    friction: 0.6,   // 增加摩擦力，减缓运动
                },
                data: graph.nodes,
                links: graph.links,
                categories: graph.categories,
                roam: true,
                label: {
                    show: true,
                    position: 'inside',
                    formatter: function(params) {
                        // 当节点的symbolSize大于20时显示name
                        return params.data.symbolSize > 10 ? params.name : '';
                    },
                    fontSize: 12,
                    color: '#fff'
                },
                lineStyle: {
                    // 去掉全局的 width 设置，让每条边的 lineStyle 生效
                    opacity: 0.5,
                    color: 'source',
                    curveness: 0.3
                },
                emphasis: {
                    focus: 'adjacency',
                    lineStyle: {
                        width: 5
                    }
                }
            }
        ]
    };

    return (
        <div style={{ position: 'relative', height: '100vh', overflow: 'hidden' }}>
            <ReactECharts
                option={option}
                style={{ height: '100%', width: '100%' }}
            />
            <div style={{
                position: 'fixed',
                bottom: '10px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                padding: '5px 10px',
                borderRadius: '5px',
                zIndex: 1000,
                fontSize: '14px',
                fontWeight: 'bold'
            }}>
                Powered by AIRS
            </div>
        </div>
    );
};

export default Page;
