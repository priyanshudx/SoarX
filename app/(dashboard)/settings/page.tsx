'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { supabase, supabaseConfigError } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bell, Lock, Save, Check, Eye, EyeOff } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('account');
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSigningOutAllSessions, setIsSigningOutAllSessions] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    role: user?.role || 'viewer',
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

  useEffect(() => {
    if (!user) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'viewer',
    }));
  }, [user]);

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

  const handleSave = async () => {
    setSaveError('');
    setSaveSuccess(false);

    if (activeTab !== 'account') {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      return;
    }

    if (!supabase) {
      setSaveError(supabaseConfigError || 'Supabase is not configured.');
      return;
    }

    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      setSaveError('Name cannot be empty.');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          name: trimmedName,
          role: user?.role || 'viewer',
          avatar: user?.avatar || '👤',
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      setFormData((prev) => ({
        ...prev,
        name: trimmedName,
      }));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordSuccess('');

    if (!supabase) {
      setPasswordError(supabaseConfigError || 'Supabase is not configured.');
      return;
    }

    if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordError('Please enter and confirm your new password.');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword,
      });

      if (error) {
        throw new Error(error.message);
      }

      setPasswordSuccess('Password updated successfully.');
      setPasswordForm({
        newPassword: '',
        confirmPassword: '',
      });
      setShowPasswordForm(false);
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Failed to update password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSignOutAllSessions = async () => {
    setPasswordError('');
    setPasswordSuccess('');

    if (!supabase) {
      setPasswordError(supabaseConfigError || 'Supabase is not configured.');
      return;
    }

    setIsSigningOutAllSessions(true);
    try {
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) {
        throw new Error(error.message);
      }

      setPasswordSuccess('Signed out from all sessions successfully.');
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Failed to sign out all sessions.');
    } finally {
      setIsSigningOutAllSessions(false);
    }
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
          {['account', 'notifications', 'security'].map((tab) => (
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
                disabled={isSaving}
                className="bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-2"
              >
                <Save size={16} />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>

            {saveError && <p className="text-sm text-destructive">{saveError}</p>}
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
              <Button
                variant="outline"
                onClick={() => {
                  setShowPasswordForm((prev) => !prev);
                  setPasswordError('');
                  setPasswordSuccess('');
                }}
                className="w-full border-destructive text-destructive hover:bg-destructive/10"
              >
                Change Password
              </Button>
              {showPasswordForm && (
                <div className="space-y-3 p-4 bg-background/70 border border-border rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">New Password</label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        name="newPassword"
                        value={passwordForm.newPassword}
                        onChange={handlePasswordInputChange}
                        className="bg-secondary border-border text-foreground pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                        aria-label={showPassword ? 'Hide passwords' : 'Show passwords'}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Confirm New Password</label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        value={passwordForm.confirmPassword}
                        onChange={handlePasswordInputChange}
                        className="bg-secondary border-border text-foreground pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                        aria-label={showPassword ? 'Hide passwords' : 'Show passwords'}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div />
                    <Button
                      type="button"
                      onClick={handleChangePassword}
                      disabled={isChangingPassword}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      {isChangingPassword ? 'Updating...' : 'Update Password'}
                    </Button>
                  </div>
                  {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
                  {passwordSuccess && <p className="text-sm text-primary">{passwordSuccess}</p>}
                </div>
              )}
              <Button
                variant="outline"
                onClick={handleSignOutAllSessions}
                disabled={isSigningOutAllSessions}
                className="w-full border-destructive text-destructive hover:bg-destructive/10"
              >
                {isSigningOutAllSessions ? 'Signing out...' : 'Sign Out All Sessions'}
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

        {/* ...integrations removed... */}

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
