'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bell, Lock, Eye, EyeOff, Save, X, Check } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('account');
  const [showPassword, setShowPassword] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: 'Security Operations Team',
    email: user?.email || '',
    role: user?.role || 'analyst',
    notifications: {
      emailAlerts: true,
      slackNotifications: true,
      criticalOnly: false,
      dailySummary: true
    },
    security: {
      twoFactorAuth: true,
      loginNotifications: true,
      ipWhitelist: true,
      sessionTimeout: '30'
    }
  });

  useEffect(() => {
    // Load immediately without artificial delay
    setLoading(false);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNotificationChange = (key: keyof typeof formData.notifications) => {
    setFormData(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: !prev.notifications[key]
      }
    }));
  };

  const handleSecurityChange = (key: keyof typeof formData.security) => {
    setFormData(prev => ({
      ...prev,
      security: {
        ...prev.security,
        [key]: typeof prev.security[key] === 'boolean' ? !prev.security[key] : prev.security[key]
      }
    }));
  };

  const handleSecuritySelectChange = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      security: {
        ...prev.security,
        [key]: value
      }
    }));
  };

  const handleSave = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  if (loading) {
    return (
      <main className="pt-20 lg:ml-64 pb-8">
        <div className="p-6 lg:p-8">
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="pt-20 lg:ml-64 pb-8">
      <div className="p-6 lg:p-8 space-y-8 max-w-6xl">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
          <p className="text-muted-foreground">Manage your account and system preferences</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-border">
          {['account', 'notifications', 'security', 'integrations'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 font-medium text-sm transition border-b-2 ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Account Settings */}
        {activeTab === 'account' && (
          <Card className="bg-card border border-border p-6 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-foreground mb-4">Account Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Full Name</label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="bg-secondary border-border text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Email Address</label>
                <Input
                  name="email"
                  type="email"
                  value={formData.email}
                  disabled
                  className="bg-secondary border-border text-muted-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Role</label>
                <select
                  name="role"
                  value={formData.role}
                  disabled
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-muted-foreground text-sm"
                >
                  <option value="admin">Administrator</option>
                  <option value="analyst">Security Analyst</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Organization</label>
                <Input
                  value="ACME Security Corp"
                  disabled
                  className="bg-secondary border-border text-muted-foreground"
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-4 pt-4 border-t border-border">
              <Button variant="outline" className="border-border">Cancel</Button>
              <Button 
                onClick={handleSave}
                className="bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-2"
              >
                <Save size={16} />
                Save Changes
              </Button>
            </div>
          </Card>
        )}

        {/* Notification Settings */}
        {activeTab === 'notifications' && (
          <Card className="bg-card border border-border p-6 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Bell size={20} className="text-primary" />
                Notification Preferences
              </h2>
            </div>

            <div className="space-y-4">
              {/* Email Alerts */}
              <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                <div>
                  <p className="font-medium text-foreground">Email Alerts</p>
                  <p className="text-sm text-muted-foreground">Receive security alerts via email</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.notifications.emailAlerts}
                  onChange={() => handleNotificationChange('emailAlerts')}
                  className="w-5 h-5 cursor-pointer"
                />
              </div>

              {/* Slack Notifications */}
              <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                <div>
                  <p className="font-medium text-foreground">Slack Notifications</p>
                  <p className="text-sm text-muted-foreground">Send alerts to Slack channel</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.notifications.slackNotifications}
                  onChange={() => handleNotificationChange('slackNotifications')}
                  className="w-5 h-5 cursor-pointer"
                />
              </div>

              {/* Critical Only */}
              <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                <div>
                  <p className="font-medium text-foreground">Critical Alerts Only</p>
                  <p className="text-sm text-muted-foreground">Only notify for critical severity</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.notifications.criticalOnly}
                  onChange={() => handleNotificationChange('criticalOnly')}
                  className="w-5 h-5 cursor-pointer"
                />
              </div>

              {/* Daily Summary */}
              <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                <div>
                  <p className="font-medium text-foreground">Daily Summary Email</p>
                  <p className="text-sm text-muted-foreground">Receive daily security summary</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.notifications.dailySummary}
                  onChange={() => handleNotificationChange('dailySummary')}
                  className="w-5 h-5 cursor-pointer"
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-4 pt-4 border-t border-border">
              <Button variant="outline" className="border-border">Cancel</Button>
              <Button 
                onClick={handleSave}
                className="bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-2"
              >
                <Save size={16} />
                Save Changes
              </Button>
            </div>
          </Card>
        )}

        {/* Security Settings */}
        {activeTab === 'security' && (
          <Card className="bg-card border border-border p-6 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Lock size={20} className="text-primary" />
                Security Settings
              </h2>
            </div>

            <div className="space-y-4">
              {/* Two-Factor Auth */}
              <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                <div>
                  <p className="font-medium text-foreground">Two-Factor Authentication</p>
                  <p className="text-sm text-muted-foreground">Enable 2FA for enhanced security</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.security.twoFactorAuth}
                  onChange={() => handleSecurityChange('twoFactorAuth')}
                  className="w-5 h-5 cursor-pointer"
                />
              </div>

              {/* Login Notifications */}
              <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                <div>
                  <p className="font-medium text-foreground">Login Notifications</p>
                  <p className="text-sm text-muted-foreground">Notify on new login locations</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.security.loginNotifications}
                  onChange={() => handleSecurityChange('loginNotifications')}
                  className="w-5 h-5 cursor-pointer"
                />
              </div>

              {/* IP Whitelist */}
              <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                <div>
                  <p className="font-medium text-foreground">IP Whitelist</p>
                  <p className="text-sm text-muted-foreground">Restrict access to specific IPs</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.security.ipWhitelist}
                  onChange={() => handleSecurityChange('ipWhitelist')}
                  className="w-5 h-5 cursor-pointer"
                />
              </div>

              {/* Session Timeout */}
              <div className="p-4 bg-secondary/50 rounded-lg">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Session Timeout (minutes)
                </label>
                <select
                  value={formData.security.sessionTimeout}
                  onChange={(e) => handleSecuritySelectChange('sessionTimeout', e.target.value)}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-foreground text-sm"
                >
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="120">2 hours</option>
                  <option value="480">8 hours</option>
                </select>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg space-y-3">
              <h3 className="font-semibold text-destructive">Danger Zone</h3>
              <Button variant="outline" className="w-full border-destructive text-destructive hover:bg-destructive/10">
                Change Password
              </Button>
              <Button variant="outline" className="w-full border-destructive text-destructive hover:bg-destructive/10">
                Sign Out All Sessions
              </Button>
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-4 pt-4 border-t border-border">
              <Button variant="outline" className="border-border">Cancel</Button>
              <Button 
                onClick={handleSave}
                className="bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-2"
              >
                <Save size={16} />
                Save Changes
              </Button>
            </div>
          </Card>
        )}

        {/* Integrations */}
        {activeTab === 'integrations' && (
          <Card className="bg-card border border-border p-6 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-foreground mb-4">Connected Integrations</h2>
            </div>

            <div className="space-y-4">
              {/* Slack */}
              <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                <div>
                  <p className="font-medium text-foreground">Slack</p>
                  <p className="text-sm text-muted-foreground">Send alerts to Slack channels</p>
                </div>
                <Button size="sm" className="bg-success hover:bg-success/90 text-white">
                  <Check size={16} className="mr-1" />
                  Connected
                </Button>
              </div>

              {/* PagerDuty */}
              <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                <div>
                  <p className="font-medium text-foreground">PagerDuty</p>
                  <p className="text-sm text-muted-foreground">Incident response integration</p>
                </div>
                <Button size="sm" variant="outline" className="border-border">
                  Connect
                </Button>
              </div>

              {/* Splunk */}
              <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                <div>
                  <p className="font-medium text-foreground">Splunk</p>
                  <p className="text-sm text-muted-foreground">SIEM log forwarding</p>
                </div>
                <Button size="sm" className="bg-success hover:bg-success/90 text-white">
                  <Check size={16} className="mr-1" />
                  Connected
                </Button>
              </div>

              {/* Microsoft Teams */}
              <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                <div>
                  <p className="font-medium text-foreground">Microsoft Teams</p>
                  <p className="text-sm text-muted-foreground">Team notifications</p>
                </div>
                <Button size="sm" variant="outline" className="border-border">
                  Connect
                </Button>
              </div>

              {/* AWS */}
              <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                <div>
                  <p className="font-medium text-foreground">Amazon Web Services</p>
                  <p className="text-sm text-muted-foreground">Cloud security monitoring</p>
                </div>
                <Button size="sm" className="bg-success hover:bg-success/90 text-white">
                  <Check size={16} className="mr-1" />
                  Connected
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Success Message */}
        {saveSuccess && (
          <div className="fixed bottom-6 right-6 bg-success text-white px-6 py-3 rounded-lg flex items-center gap-2 shadow-lg">
            <Check size={18} />
            Settings saved successfully
          </div>
        )}
      </div>
    </main>
  );
}
