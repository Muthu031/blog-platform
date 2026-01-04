import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { User } from '../types';
import NavBar from '../components/NavBar';

// Sample blog posts
const blogPosts = [
  {
    id: 1,
    title: 'Building a Future-Ready Blog Platform',
    excerpt: 'Learn how to create a premium blog that positions you as an expert and drives organic growth.',
    category: 'Tutorials',
    readTime: '5 min read',
    date: '2026-01-04',
  },
  {
    id: 2,
    title: 'The Art of Writing Insightful Content',
    excerpt: 'Discover the principles behind creating content that resonates and converts readers into loyal followers.',
    category: 'Insights',
    readTime: '7 min read',
    date: '2026-01-03',
  },
  {
    id: 3,
    title: 'From Code to Monetization: Scaling Your Tech Blog',
    excerpt: 'A case study on turning technical writing into a sustainable income stream.',
    category: 'Case Studies',
    readTime: '10 min read',
    date: '2026-01-02',
  },
];



export default function Home() {
  const { userId, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [msg, setMsg] = useState<string>('Loading...');
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState<boolean>(true);

  useEffect(() => {
    // const fetchMessage = async () => {
    //   try {
    //     const response = await api.get<{ message: string }>('/hello');
    //     setMsg(response?.data?.message);
    //   } catch (error) {
    //     setMsg('Failed to load message');
    //   }
    // };

    const fetchUser = async () => {
      if (userId) {
        try {
          const response = await api.get<User>(`/users/${userId}`);
          setUser(response.data);
        } catch (error) {
          console.error('Failed to fetch user details:', error);
        } finally {
          setLoadingUser(false);
        }
      } else {
        setLoadingUser(false);
      }
    };

    // fetchMessage();
    fetchUser();
  }, [userId]);

  const handleLogout = async () => {
    await logout();
    // navigate to auth page after logout
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
      <NavBar userName={user?.name} loadingUser={loadingUser} theme={theme} onToggleTheme={toggleTheme} onLogout={handleLogout} />

      {/* Hero Section */}
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Expert Developer & Writer
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Building future-ready applications and sharing insights through premium content that drives growth and innovation.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <span className="text-sm text-gray-500 dark:text-gray-400 self-center">API Status: {user ? 'Active' : 'Inactive'}</span>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-8">About Me</h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
            I am a passionate developer and writer dedicated to creating innovative solutions and sharing knowledge through high-quality content.
            With expertise in modern web technologies, I build applications that are not only functional but also user-friendly and scalable.
          </p>
        </div>
      </section>

      {/* Skills Section */}
      <section id="skills" className="py-16 px-4 bg-gray-50 dark:bg-gray-800/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">Skills</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-lg">
              <h3 className="text-xl font-semibold mb-4">Frontend Development</h3>
              <ul className="text-gray-600 dark:text-gray-300 space-y-2">
                <li>React, TypeScript, JavaScript</li>
                <li>Tailwind CSS, HTML, CSS</li>
                <li>Next.js, Vite</li>
              </ul>
            </div>
            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-lg">
              <h3 className="text-xl font-semibold mb-4">Backend Development</h3>
              <ul className="text-gray-600 dark:text-gray-300 space-y-2">
                <li>Node.js, Express, Hono</li>
                <li>PostgreSQL, Drizzle ORM</li>
                <li>REST APIs, Authentication</li>
              </ul>
            </div>
            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-lg">
              <h3 className="text-xl font-semibold mb-4">Tools & Technologies</h3>
              <ul className="text-gray-600 dark:text-gray-300 space-y-2">
                <li>Git, Docker, CI/CD</li>
                <li>Testing, Performance Optimization</li>
                <li>Agile, Scrum</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Experience Section */}
      <section id="experience" className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">Experience</h2>
          <div className="space-y-8">
            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-lg">
              <h3 className="text-2xl font-semibold mb-2">Senior Full-Stack Developer</h3>
              <p className="text-blue-600 dark:text-blue-400 mb-4">Tech Company • 2022 - Present</p>
              <p className="text-gray-600 dark:text-gray-300">
                Leading development of scalable web applications, mentoring junior developers, and implementing best practices in code quality and performance.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-lg">
              <h3 className="text-2xl font-semibold mb-2">Full-Stack Developer</h3>
              <p className="text-blue-600 dark:text-blue-400 mb-4">Startup Inc • 2020 - 2022</p>
              <p className="text-gray-600 dark:text-gray-300">
                Built and maintained multiple client projects, integrated third-party APIs, and optimized application performance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Projects Section */}
      <section id="projects" className="py-16 px-4 bg-gray-50 dark:bg-gray-800/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">Projects</h2>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {blogPosts.map((post) => (
              <article
                key={post.id}
                className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-3 uppercase tracking-wide">
                  {post.category}
                </div>
                <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white leading-tight">
                  {post.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                  {post.excerpt}
                </p>
                <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-4">
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    {post.readTime}
                  </span>
                  <span>{post.date}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Latest Work Section */}
      <section id="latest-work" className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">Latest Work</h2>
          <div className="grid gap-8 md:grid-cols-2">
            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-lg">
              <h3 className="text-2xl font-semibold mb-4">E-commerce Platform</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                A modern e-commerce solution with real-time inventory, payment integration, and admin dashboard.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm">React</span>
                <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-3 py-1 rounded-full text-sm">Node.js</span>
                <span className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-3 py-1 rounded-full text-sm">PostgreSQL</span>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-lg">
              <h3 className="text-2xl font-semibold mb-4">Blog Platform</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                A comprehensive blogging platform with user authentication, rich text editing, and SEO optimization.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm">Next.js</span>
                <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-3 py-1 rounded-full text-sm">TypeScript</span>
                <span className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-3 py-1 rounded-full text-sm">Tailwind</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-16 px-4 bg-gray-50 dark:bg-gray-800/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-8">Get In Touch</h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
            I'm always open to discussing new opportunities, collaborations, or just having a chat about technology.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="mailto:contact@example.com" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors">
              Email Me
            </a>
            <a href="https://linkedin.com/in/yourprofile" className="bg-gray-800 dark:bg-gray-700 hover:bg-gray-900 dark:hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition-colors">
              LinkedIn
            </a>
          </div>
        </div>
      </section>

      {/* Blog/Portfolio Projects Section - Now removed, replaced with Projects above */}
      <section className="py-16 px-4 bg-gray-50 dark:bg-gray-800/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">Featured Articles & Projects</h2>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {blogPosts.map((post) => (
              <article
                key={post.id}
                className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-3 uppercase tracking-wide">
                  {post.category}
                </div>
                <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white leading-tight">
                  {post.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                  {post.excerpt}
                </p>
                <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-4">
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    {post.readTime}
                  </span>
                  <span>{post.date}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-gray-600 dark:text-gray-400">
            © 2026 Portfolio Blog. Built with passion for excellence.
          </p>
        </div>
      </footer>
    </div>
  );
}
