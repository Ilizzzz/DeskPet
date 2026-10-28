import { Component, type ErrorInfo, type ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('界面渲染失败', error, info.componentStack);
  }

  render() {
    if (this.state.failed)
      return (
        <main className="fatal-error" role="alert">
          <div>
            <span className="fatal-error-icon">!</span>
            <h1>界面暂时无法显示</h1>
            <p>本地数据没有被删除。请重新加载；如果问题持续，可从托盘退出后重启。</p>
            <button onClick={() => window.location.reload()}>重新加载</button>
          </div>
        </main>
      );
    return this.props.children;
  }
}
