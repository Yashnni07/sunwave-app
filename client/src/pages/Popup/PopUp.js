const PopUp = ({ isOpen, onClose, children }) => {
    if (!isOpen) return null; // Don't render the modal if `isOpen` is false

    return (
        <div className="popup-overlay">
            <div className="popup-content">
                <button className="popup-close-button" onClick={onClose}>
                    ✖
                </button>
                {children}
            </div>
        </div>
    );
};

export default PopUp;
