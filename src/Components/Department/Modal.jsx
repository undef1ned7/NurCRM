import React from 'react';
import styles from './Department.module.scss'; 

const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <button className={styles.closeButton} onClick={onClose}>
                    &times;
                </button>
                <h2>{title}</h2>
                {children}
            </div>
        </div>
    );
};

export default Modal;