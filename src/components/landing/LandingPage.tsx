import '../../styles/landing.css'
import { COMPETITION_SCENARIOS } from '../../config/scenarios'

const GITHUB_URL = 'https://github.com/cc3441190-ux/meituan-agent'

const FEATURES = [
  {
    icon: '💬',
    tone: 'orange' as const,
    title: '一句话理解意图',
    desc: '自然语言描述下午想做什么，Agent 自动解析人数、预算、时段与偏好，无需填表。',
  },
  {
    icon: '🗺️',
    tone: 'sage' as const,
    title: '可执行行程规划',
    desc: '串联「去哪玩 → 去哪吃 → 额外活动」，计算路程、等位与缓冲，输出带时间的完整方案。',
  },
  {
    icon: '🔄',
    tone: 'amber' as const,
    title: '异常协商与重规划',
    desc: '餐厅满座、门票售罄或时间冲突时，主动提示并提供替换方案，而不是静默失败。',
  },
  {
    icon: '✅',
    tone: 'sage' as const,
    title: '确认后并发交付',
    desc: '用户确认节点后，订位、蛋糕、鲜花、叫车等任务并发执行，实时追踪交付进度。',
  },
  {
    icon: '📤',
    tone: 'orange' as const,
    title: '分享与多人协同',
    desc: '生成邀请卡片与分享话术，支持待确认状态的协同提醒，方便家庭或朋友一起决策。',
  },
  {
    icon: '⚡',
    tone: 'amber' as const,
    title: '秒级响应 · 可离线',
    desc: 'Mock 工具链本地运行，规划到方案展示通常在数秒内完成，演示环境零外部依赖。',
  },
]

const STEPS = [
  {
    title: '说出想法',
    desc: '用口语描述下午安排，例如「带孩子和老婆出门玩几个小时，别太远」。',
  },
  {
    title: 'AI 理解并规划',
    desc: '解析约束、检索 POI、核对库存与路线，生成带时间轴的可执行方案。',
  },
  {
    title: '确认与微调',
    desc: '在地图上查看各站详情，调整时间或替换节点，处理满座等异常后再确认。',
  },
  {
    title: '一键交付',
    desc: '确认后自动完成订位与周边服务，生成分享卡片，把行程发给同行的人。',
  },
]

export function LandingPage() {
  return (
    <div className="landing-root">
      <header className="landing-nav">
        <div className="landing-nav-inner">
          <a href="/" className="landing-logo">
            <span className="landing-logo-mark" aria-hidden>
              出
            </span>
            <span>本地出行 Agent</span>
          </a>
          <nav className="landing-nav-links" aria-label="页面导航">
            <a href="#features">核心能力</a>
            <a href="#flow">使用流程</a>
            <a href="#scenarios">示范场景</a>
          </nav>
          <a href="/demo" className="landing-btn landing-btn-primary">
            立即体验
          </a>
        </div>
      </header>

      <section className="landing-section landing-hero">
        <div>
          <div className="landing-badge">
            <span className="landing-badge-dot" aria-hidden />
            本地生活 · 短时活动规划与执行
          </div>
          <h1>
            一句话出发，
            <br />
            <em>帮你把下午安排做完</em>
          </h1>
          <p className="landing-hero-lead">
            不是搜索推荐列表，而是可执行的出行 Agent：理解你的目标，规划玩·吃·额外活动，
            核对订位与门票，确认后一键交付，并生成可直接转发的分享话术。
          </p>
          <div className="landing-hero-actions">
            <a href="/demo" className="landing-btn landing-btn-primary">
              打开 Demo 体验
            </a>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="landing-btn landing-btn-secondary"
            >
              查看源码
            </a>
          </div>
          <div className="landing-stats">
            <div className="landing-stat">
              <strong>3–8 小时</strong>
              <span>短时活动窗口</span>
            </div>
            <div className="landing-stat">
              <strong>4 段式</strong>
              <span>分层规划策略</span>
            </div>
            <div className="landing-stat">
              <strong>全链路</strong>
              <span>规划 → 确认 → 交付</span>
            </div>
          </div>
        </div>

        <div className="landing-phone-wrap" aria-hidden>
          <div className="landing-phone-glow" />
          <div className="landing-phone">
            <div className="landing-phone-notch">
              <span />
            </div>
            <div className="landing-phone-body">
              <div className="landing-mock-bubble">
                今天下午想带孩子和老婆出去玩，别太远，老婆在减肥…
              </div>
              <div className="landing-mock-card">
                <div className="landing-mock-card-title">下午方案 · 已理解</div>
                <div className="landing-mock-row">
                  <span className="landing-mock-time">14:00</span>
                  <span>城市绿谷亲子乐园 · 步行 12 分钟</span>
                </div>
                <div className="landing-mock-row">
                  <span className="landing-mock-time">16:30</span>
                  <span>轻食沙拉坊 · 有位 · 等位约 8 分钟</span>
                </div>
                <div className="landing-mock-row">
                  <span className="landing-mock-time">18:00</span>
                  <span>滨江步道散步 · 顺路回家</span>
                </div>
              </div>
              <div className="landing-mock-cta">确认方案并开始交付</div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="landing-section">
        <div className="landing-section-head">
          <h2>核心能力</h2>
          <p>从意图理解到并发交付，覆盖本地短时出行的完整 Agent 链路</p>
        </div>
        <div className="landing-features">
          {FEATURES.map((f) => (
            <article key={f.title} className="landing-feature">
              <div className={`landing-feature-icon landing-feature-icon--${f.tone}`}>{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="flow" className="landing-flow">
        <div className="landing-section">
          <div className="landing-section-head">
            <h2>使用流程</h2>
            <p>四步完成从「一句话」到「可分享的可执行行程」</p>
          </div>
          <div className="landing-steps">
            {STEPS.map((s) => (
              <article key={s.title} className="landing-step">
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="scenarios" className="landing-section">
        <div className="landing-section-head">
          <h2>示范场景</h2>
          <p>Demo 内置比赛预设，一键填入即可体验完整规划与交付流程</p>
        </div>
        <div className="landing-scenarios">
          {COMPETITION_SCENARIOS.filter((s) => s.enabled).map((s) => (
            <article key={s.id} className="landing-scenario">
              <span className="landing-scenario-tag">{s.subtitle}</span>
              <h3>{s.title}</h3>
              <p>适合体验意图解析、时间轴规划与异常协商的完整链路。</p>
              <blockquote className="landing-scenario-quote">{s.prompt}</blockquote>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-cta-band" aria-labelledby="cta-heading">
        <h2 id="cta-heading">准备好试试了吗？</h2>
        <p>在浏览器中打开 Demo，输入一句话目标，体验规划、确认与交付的全流程。</p>
        <a href="/demo" className="landing-btn landing-btn-primary">
          立即开始体验
        </a>
      </section>

      <footer className="landing-footer">
        <span>本地场景短时活动规划与执行 Agent · Web Demo</span>
        <div className="landing-footer-links">
          <a href="/demo">在线体验</a>
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
        </div>
      </footer>
    </div>
  )
}
