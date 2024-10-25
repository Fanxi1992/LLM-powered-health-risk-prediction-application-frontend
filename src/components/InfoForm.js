import React from 'react';
import { Modal, Form, Input, Button, message } from 'antd';
import axios from 'axios';

const InfoForm = ({ onClose }) => {
  const [form] = Form.useForm();

  const onFinish = async (values) => {
    try {
      await axios.post('/api/user-info', values);
      message.success('信息提交成功');
      onClose();
    } catch (error) {
      message.error('提交失败,请重试');
    }
  };

  return (
    <Modal
      title="个人信息"
      visible={true}
      onCancel={onClose}
      footer={null}
    >
      <Form form={form} onFinish={onFinish} layout="vertical">
        <Form.Item name="name" label="姓名" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="age" label="年龄" rules={[{ required: true }]}>
          <Input type="number" />
        </Form.Item>
        <Form.Item name="email" label="邮箱" rules={[{ required: true, type: 'email' }]}>
          <Input />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" block>
            提交
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default InfoForm;