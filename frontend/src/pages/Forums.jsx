import React from 'react'
import { useNavigate } from 'react-router-dom';
import { testThreads } from './data'

const Forems = () => {

  const data = testThreads;
  const navigate = useNavigate();
  const navigateToThread = (threadId) =>  {navigate(`/thread/${threadId}`)};

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
          onClick={()=>navigateToThread(item.id)}> See Thread</button>
        </div>
      ))}
      
    </div>
  )
}

export default Forems