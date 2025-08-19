// Input.jsx
import React from 'react';

import styles from './DepartmentDetails.module.scss'; 

const Input = ({ label, name, value, onChange, ...props }) => {
    return (
        <div className={styles.formGroup}>
            <label htmlFor={name}>{label}</label> 
            <input
                type="text"
                id={name}
                name={name}
                value={value}
                onChange={onChange}
                {...props} 
            />
        </div>
    );
};

export default Input;