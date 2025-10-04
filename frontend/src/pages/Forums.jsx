import React from 'react'
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
//import { get } from 'http';
//import { useEffect } from 'react';


const Forems = () => {
  const [data, setData] = React.useState([]);
  const navigate = useNavigate();
  const navigateToThread = (threadId) =>  {navigate(`/forums/${threadId}`)};
  const [newthread, setNewThread] = React.useState("")

  const submitThreads = async () => {
    console.log(newthread)
    const res = await fetch('http://localhost:3000/api/createthreads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies for authentication
      body: JSON.stringify({ text: newthread }),
    });
    const data = await res.json();
    const {message} = data; 
    console.log("postedx2", message);
    window.location.reload(true);
  }


  useEffect(() => {
    const getThreads = async () => {
      console.log(newthread)
      const res = await fetch('http://localhost:3000/api/getthreads', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      const data = await res.json();
      console.log(data)
      setData(data)
    };
    getThreads();
    console.log("data", data)
  }, []);

  return (
    <div className='mt-24'>
      {data.map((item, index) => (
        <div key={index} className='border-2 border-black m-4 p-4'>
          <h2 className='font-bold text-lg'>{item.title}</h2>
          <p className='text-sm'>by {item.user}</p>
          <div className='mt-2'>
            {item.comments.map((comment, cIndex) => (
              <div key={cIndex} className='border-t border-gray-300 mt-2 pt-2 '>
                <p className='text-black'>{comment.text}</p>
                <p className='text-xs text-gray-500'>by {comment.user}</p>
              </div>
            ))}
          </div>
          
          <button className='mt-5 text-blue-500 underline hover:font-blue-200' 
          onClick={()=>navigateToThread(item._id)}> See Thread</button>
        </div>
      ))}
      <div className="p-4 m-4 border-2 border-black  w-max-screen">
        <h2 className="text-2xl"> Create New Thread</h2>
        <div className='mx-3 flex'>
        <input value={newthread} onChange={(e) => {setNewThread(e.target.value)}} className=" w-full border-1 m-2 p-2 "></input>
        <button className='m-2 p-2 border-2 border-black hover:bg-black hover:text-white'
        onClick={submitThreads}>Submit</button>
        </div>
      </div>
    </div>
  )
}

export default Forems