import { useState, useEffect } from 'react';


export default function ProfileEditor() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState('');
  const [nickname, setNickname] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [preview, setPreview] = useState(null);
  const [headerImage, setHeaderImage] = useState(null);
  const [headerPreview, setHeaderPreview] = useState(null);
  const [saved, setSaved] = useState(null);
  const [posts, setPosts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [userEmail, setUserEmail] = useState(null);
  const [form , setForm] = useState({
    bio: '',
    location:'',
    wallet: ''
  });
  useEffect(() => {
    fetch('/api/profile')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.email) {
            setUserEmail(data.email);
            return fetch(`/profile/${data.email}`);
        } 
        else {
            throw new Error("Not authorized");
        }
      })

      
      .then(res => res.ok ? res.json() : null)
     
      .then((data) => {
        if(!data) throw new Error ("Failed to load user data")
        setProfile(data);
        setBio(data.bio || '');
        setLocation(data.location || '');
        setNickname(data.nickname || '');
        setPreview(data.avatar || null);
        setHeaderPreview(data.header || null);
        setPosts(data.posts || []);
        setMessages(data.messages || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading profile:', err);
        setLoading(false);
      });
  }, []);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatar(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleHeaderChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setHeaderImage(file);
      setHeaderPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('bio', bio);
    formData.append('location', location);
    formData.append('nickname', nickname);
    formData.append('wallet', form.wallet);
    if (avatar) formData.append('avatar', avatar);
    if (headerImage) formData.append('header', headerImage);

    const res = await fetch('/update-profile', {
      method: 'POST',
      body: formData
    });

    if (res.ok) {
      alert('Profile updated!');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  if (loading) return <p className="text-center">Loading...</p>;
  if (!profile) return <p className='text-center text-red-600'>Profile not found</p>;
  const isOwnProfile = true;
  return (
    <>
      <div className="relative w-full h-48 bg-gray-200 rounded overflow-hidden mb-4">
        {headerPreview && (
          <img src={headerPreview} alt="header" className="object-cover w-full h-full" />
        )}
        {isOwnProfile && (
          <input type="file" accept="image/*" onChange={handleHeaderChange} className="absolute top-2 right-2 text-xs" />
        )}
      </div>

      <div className="max-w-xl mx-auto mt-10 p-6 bg-white rounded shadow">
        <h2 className="text-xl font-bold mb-4">Edit profile</h2>

        {isOwnProfile ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-4 mb-4">
              <img src={preview} alt="avatar" className="w-20 h-20 rounded-full border-white shadow-md object-cover" />
              <div>
                <p className="font-semibold text-lg">{profile.email}</p>
                <input type="file" accept="image/*" onChange={handleAvatarChange} />
              </div>
            </div>
            <input type="text" placeholder="Nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} className="w-full border rounded p-2" />
            <input type="text" placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} className="w-full border rounded p-2" />
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Description..." className="w-full border rounded p-2" rows={4}></textarea>
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Save</button>
            {saved && <p className="text-green-600 text-sm animate-fade-in">✅ Saved</p>}
          </form>
        ) : (
          <div className="space-y-2">
            <img src={preview} alt="avatar" className="w-20 h-20 rounded-full border-white shadow-md object-cover" />
            <p><strong>Nickname:</strong> {profile.nickname}</p>
            <p><strong>Email:</strong> {profile.email}</p>
            <p><strong>Location:</strong> {profile.location}</p>
            <p><strong>Bio:</strong> {profile.bio}</p>
            <p><strong>Joined:</strong> {new Date(profile.createdAt).toLocaleString()}</p>
          </div>
        )}
      </div>

      <div className="max-w-xl mx-auto mt-6 bg-white p-4 rounded shadow">
        <h3 className="text-lg font-semibold mb-2">Forum posts</h3>
        {posts.length > 0 ? (
          posts.map((post) => (
            <div key={post.id} className="mb-3 border-b pb-2">
              <p className="font-bold">{post.title}</p>
              <p className="text-sm text-gray-600 whitespace-pre-line">{post.content}</p>
              <p className='text-xs text-gray-400'>{new Date(post.timestamp).toLocaleString()}</p>
            </div>
          ))
        ) : (
          <p className="text-gray-500">No posts yet</p>
        )}
      </div>

      <div className="max-w-xl mx-auto mt-6 bg-white p-4 rounded shadow">
        <h3 className="text-lg font-semibold mb-2">Public messages</h3>
        {messages.length > 0 ? (
          messages.map((msg, i) => (
            <div key={i} className="mb-3 border-b pb-2">
              <p><strong>To:</strong> {msg.to}</p>
              <p>{msg.text}</p>
              <p className="text-xs text-gray-400">{new Date(msg.time).toLocaleString()}</p>
            </div>
          ))
        ) : (
          <p className="text-gray-500">No messages yet</p>
        )}
        <label className='block mb-2'>
          <span className='text-sm font-medium'>EVM Wallet Adress</span>
          <input type="text" className='border p-2 rounded w-full bg-white dark:bg-gray-800 dark:text-white' value={form.wallet || ''} onChange={(e) => setForm({... form, wallet: e.target.value})} placeholder='0x...' />
        </label>
      </div>
    </>
  );
}
